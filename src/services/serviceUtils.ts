export const extract = (response: any) => response.data?.data ?? response.data;

export const normalizeList = (items: any) => {
  if (!Array.isArray(items)) return items;
  return items.map((item: any) => item.status ? { ...item, status: item.status.toLowerCase() } : item);
};
