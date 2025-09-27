export { default } from "../../../ozon/carrier/[id]/page";

// 静态导出（NEXT_EXPORT）下，动态段必须提供 generateStaticParams
export const dynamicParams = false;
export async function generateStaticParams() { return []; }
