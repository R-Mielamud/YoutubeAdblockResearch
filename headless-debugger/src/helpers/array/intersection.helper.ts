export const hasIntersection = <T>(array1: T[], array2: T[]): boolean => {
	return array1.some((element) => array2.includes(element));
};
