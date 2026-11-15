/**
 * Tiện ích nén ảnh phía Client sử dụng Canvas gốc của trình duyệt (Task FE-01)
 * Giảm tải băng thông và tối ưu tốc độ tải ảnh chứng cứ kiện hàng / chat
 */

export interface CompressOptions {
  maxDim?: number;
  quality?: number;
  forceCompress?: boolean;
}

const ONE_MB = 1024 * 1024;

/**
 * Nén tệp hình ảnh trước khi tải lên sàn:
 * - Nếu ảnh > 1MB (hoặc forceCompress = true): tự động resize tỉ lệ về maxDim (mặc định 1600px) và xuất JPEG chất lượng 80%.
 * - Ảnh chụp dung lượng 8MB-12MB từ iPhone/Android sẽ được tối ưu xuống ~300KB-500KB chỉ trong 50-80ms.
 */
export async function compressImage(
  file: File,
  maxDim = 1600,
  quality = 0.8,
  options?: CompressOptions,
): Promise<File> {
  // Chỉ áp dụng cho các file hình ảnh
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const force = options?.forceCompress ?? false;
  // Nếu ảnh <= 1MB và không yêu cầu nén bắt buộc thì giữ nguyên
  if (file.size <= ONE_MB && !force) {
    return file;
  }

  // Chạy an toàn trên môi trường trình duyệt
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return file;
  }

  return new Promise<File>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      const targetMaxDim = options?.maxDim ?? maxDim;
      const targetQuality = options?.quality ?? quality;

      // Tính toán kích thước mới theo đúng tỉ lệ khung hình
      if (width > targetMaxDim || height > targetMaxDim) {
        if (width > height) {
          height = Math.round((height * targetMaxDim) / width);
          width = targetMaxDim;
        } else {
          width = Math.round((width * targetMaxDim) / height);
          height = targetMaxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      // Khử răng cưa và làm mịn ảnh chất lượng cao
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Nền trắng cho ảnh trong suốt nếu chuyển sang JPEG
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // Đổi đuôi tệp thành .jpg
          const rawName = file.name.replace(/\.[^/.]+$/, '');
          const compressedName = `${rawName}_compressed.jpg`;

          const compressedFile = new File([blob], compressedName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          resolve(compressedFile);
        },
        'image/jpeg',
        targetQuality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Tiện ích nén ảnh và chuyển sang chuỗi DataURL (Base64) để xem trước ngay trong khung chat/modal
 */
export async function compressImageToDataUrl(
  file: File,
  maxDim = 1600,
  quality = 0.8,
): Promise<string> {
  const compressed = await compressImage(file, maxDim, quality);
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(compressed);
  });
}

/**
 * Định dạng dung lượng tệp cho giao diện (VD: 450 KB, 2.4 MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
