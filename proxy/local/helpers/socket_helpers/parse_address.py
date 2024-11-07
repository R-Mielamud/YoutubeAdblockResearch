def parse_address(address: str) -> tuple[str, int] | None:
	try:
		parts = address.split(":")
		host = parts[0]

		if len(parts) > 2:
			return

		port = 443 if len(parts) == 1 else int(parts[1])

		return host, port
	except:
		return
