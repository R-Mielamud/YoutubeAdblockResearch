import typing


class ResourceLike(typing.Protocol):
	def close(self) -> None: ...
