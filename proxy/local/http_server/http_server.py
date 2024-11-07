import typing
import errno
import io
import select
import socket
import urllib.parse
import http.server
import http.client
from shared import constants
from .. import helpers
from .http_connection_pool import HttpConnectionPool


class ProxyRequestHandler(http.server.BaseHTTPRequestHandler):
	timeout = constants.socket.TIMEOUT_SEC
	protocol_version = "HTTP/1.1"

	def setup(self) -> None:
		super().setup()

		self.http_connection_pool = HttpConnectionPool()

	def finish(self) -> None:
		super().finish()

		self.http_connection_pool.clear()

	def do_http_request(self) -> None:
		if self.path.startswith("/"):
			self.path = self.headers.get("Host", "") + self.path

		parsed_url = urllib.parse.urlparse(self.path)

		if parsed_url.scheme not in ("http", ""):
			return self.send_error(http.client.BAD_GATEWAY)

		host = parsed_url.hostname

		try:
			port = parsed_url.port
		except:
			return self.send_error(http.client.BAD_GATEWAY)

		if host is None or host == "":
			return self.send_error(http.client.BAD_GATEWAY)

		if port is None or port == 0:
			port = 80

		if "Host" in self.headers:
			del self.headers["Host"]

		self.headers["Host"] = parsed_url.netloc

		request_headers = dict(self.headers)
		self.remove_hop_by_hop_headers(request_headers)

		try:
			target_connection = self.http_connection_pool.get((host, port))
		except:
			return self.send_error(http.client.BAD_GATEWAY)

		try:
			request_body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
		except:
			request_body = b""

		try:
			target_connection.request(self.command, parsed_url.path, request_body, headers=request_headers)
			response = target_connection.getresponse()
		except:
			# remote server closed the connection

			try:
				target_connection = self.http_connection_pool.get((host, port), force_refresh=True)
				target_connection.request(self.command, parsed_url.path, request_body, headers=request_headers)
			except:
				return self.send_error(http.client.BAD_GATEWAY)

			response = target_connection.getresponse()

		self.log_request(response.status)
		self.send_response_only(response.status)

		response_headers = dict(response.headers)
		self.remove_hop_by_hop_headers(response_headers)

		for header, value in response_headers.items():
			self.send_header(header, value)

		self.end_headers()

		if "Content-Length" not in response.headers:
			self.relay_1way(response, self.wfile)
			response.close()
		else:
			self.wfile.write(response.read())

	do_HEAD = do_http_request
	do_GET = do_http_request
	do_POST = do_http_request
	do_PUT = do_http_request
	do_PATCH = do_http_request
	do_DELETE = do_http_request
	do_OPTIONS = do_http_request

	def do_CONNECT(self) -> None:
		parsed_address = helpers.socket.parse_address(self.path)

		if parsed_address is None:
			return self.send_error(http.client.BAD_GATEWAY)

		try:
			target_connection = helpers.socket.tcp_connect(parsed_address, timeout=self.timeout)
		except:
			return self.send_error(http.client.BAD_GATEWAY)

		try:
			target_connection.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
		except socket.error as err:
			if err.errno != errno.ENOPROTOOPT:
				return self.send_error(http.client.BAD_GATEWAY)

		self.send_response(http.client.OK, "Connection Established")
		self.end_headers()
		self.relay_2way(target_connection, self.connection)
		target_connection.close()

	def remove_hop_by_hop_headers(self, headers: typing.MutableMapping[str, str]) -> None:
		for header in constants.http.HOP_BY_HOP_HEADERS:
			if header in headers:
				del headers[header]

	def relay_1way(self, sender: io.IOBase, receiver: io.IOBase) -> None:
		try:
			while True:
				data = sender.read(constants.socket.STREAMING_BUFFER_SIZE_BYTES)

				if len(data) == 0:
					break

				receiver.write(data)
		except:
			pass

	def relay_2way(self, socket1: socket.socket, socket2: socket.socket) -> None:
		self.close_connection = False
		connections: list[socket.socket] = [socket1, socket2]

		try:
			while not self.close_connection:
				readable, _, exceptional = select.select(
					connections,
					[],
					connections,
					self.timeout,
				)

				if len(exceptional) > 0 or len(readable) == 0:
					self.close_connection = True
					break

				for sender in readable:
					receiver: socket.socket = socket2 if sender is socket1 else socket1
					data = sender.recv(constants.socket.STREAMING_BUFFER_SIZE_BYTES)

					if len(data) == 0:
						self.close_connection = True
						break

					receiver.send(data)
		except socket.error:
			self.close_connection = True


class ProxyHttpServer(http.server.ThreadingHTTPServer):
	def __init__(self, server_address: tuple[str | bytes | bytearray, int]) -> None:
		super().__init__(server_address, ProxyRequestHandler)
