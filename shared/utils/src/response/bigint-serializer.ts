/**
 * =============================================================================
 * Project Nexus - BigInt JSON Serialization Helper
 * Khắc phục triệt để lỗi: TypeError: Do not know how to serialize a BigInt
 * Khi Express / Node.js trả đối tượng có trường BigInt qua res.json()
 * =============================================================================
 */

export function setupBigIntSerialization(): void {
  // Bổ sung method toJSON cho BigInt prototype để JSON.stringify() tự động ép kiểu thành chuỗi
  (BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function (): string {
    return this.toString();
  };
}

// Tự động kích hoạt khi import module này
setupBigIntSerialization();
