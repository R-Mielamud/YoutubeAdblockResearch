from .http_server import ProxyHttpServer


if __name__ == "__main__":
	server = ProxyHttpServer(("", 9000))
	server.serve_forever()
