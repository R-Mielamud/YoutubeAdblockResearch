import ipaddress
import socket


def get_safe_tcp_connection_options(address: tuple[str, int]) -> list[tuple[int, tuple[str, int]]]:
	host, port = address

	try:
		address_infos = socket.getaddrinfo(host, port, 0, socket.SOCK_STREAM, socket.IPPROTO_TCP)
		options: list[tuple[int, tuple[str, int]]] = []

		for info in address_infos:
			ip = info[4][0]
			real_port = info[4][1]

			if ipaddress.ip_address(ip).is_global:
				options.append((info[0], (ip, real_port)))

		return options
	except:
		return []
