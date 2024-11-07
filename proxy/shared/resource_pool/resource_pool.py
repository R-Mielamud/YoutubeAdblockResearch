from collections import OrderedDict
from .resource_like import ResourceLike


class ResourcePool[TParams, TResource: ResourceLike]:
	resources: OrderedDict[TParams, TResource]

	def __init__(self, capacity: int = 24) -> None:
		if capacity <= 0:
			raise ValueError("capacity must be at least 1")

		self.capacity = capacity
		self.resources = OrderedDict[TParams, TResource]()

	def get(self, params: TParams, force_refresh: bool = False) -> TResource:
		if params in self.resources:
			if force_refresh:
				self.resources[params].close()
			else:
				self.resources.move_to_end(params, last=False)

				return self.resources[params]

		resource = self.create(params)

		self.resources[params] = resource
		self.resources.move_to_end(params, last=False)
		self.trim_cache()

		return resource

	def clear(self) -> None:
		for resource in self.resources.values():
			resource.close()

		self.resources.clear()

	def trim_cache(self):
		while len(self.resources) > self.capacity:
			_, resource = self.resources.popitem()
			resource.close()

	def create(self, params: TParams) -> TResource:
		raise NotImplementedError
