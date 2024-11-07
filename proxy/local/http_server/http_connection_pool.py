import http.client
from shared import constants
from shared.resource_pool import ResourcePool
from .. import helpers


class HttpConnectionPool(ResourcePool[tuple[str, int], http.client.HTTPConnection]):
	def create(self, params: tuple[str, int]) -> http.client.HTTPConnection:
		connection = http.client.HTTPConnection(
			*params,
			timeout=constants.socket.TIMEOUT_SEC,
			blocksize=constants.socket.STREAMING_BUFFER_SIZE_BYTES,
		)

		setattr(connection, "_create_connection", helpers.socket.tcp_connect)

		connection.connect()

		return connection
