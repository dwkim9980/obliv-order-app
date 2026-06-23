export function detectVendor(url: string | null | undefined): string {
  if (!url) return "-";
  try {
    const host = new URL(url).hostname;
    if (host.includes("coupang.com")) return "쿠팡";
    if (host.includes("gmarket.co.kr") || host.includes("auction.co.kr")) return "지마켓";
    if (host.includes("naver.com")) return "네이버";
    return "기타";
  } catch {
    return "기타";
  }
}
