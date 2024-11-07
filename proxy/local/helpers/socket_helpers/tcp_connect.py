import socket
from .get_safe_tcp_connection_options import get_safe_tcp_connection_options


def tcp_connect(
	address: tuple[str, int],
	timeout: float | None = None,
	source_address: tuple[str, int] | None = None,
	*,
	all_errors: bool = False,
) -> socket.socket:
	exceptions: list[Exception] = []

	for family, real_address in get_safe_tcp_connection_options(address):
		sock = None

		try:
			sock = socket.socket(family, socket.SOCK_STREAM, socket.IPPROTO_TCP)

			if timeout is not None:
				sock.settimeout(timeout)

			if source_address is not None:
				sock.bind(source_address)

			sock.connect(real_address)
			exceptions.clear()

			return sock
		except socket.error as err:
			if not all_errors:
				exceptions.clear()

			exceptions.append(err)

			if sock is not None:
				sock.close()

	if len(exceptions) > 0:
		try:
			if not all_errors:
				raise exceptions[0]

			raise ExceptionGroup("tcp_connect failed", exceptions)
		finally:
			exceptions.clear()
	else:
		raise socket.error("no safe connection options")
