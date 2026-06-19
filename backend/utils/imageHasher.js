const sharp = require('sharp');
const axios = require('axios');

/**
 * Hàm biến đổi ảnh (Buffer hoặc URL) thành chuỗi vân tay nhị phân 64-bit
 */
const generateImageHash = async (input) => {
  try {
    let buffer;
    if (Buffer.isBuffer(input)) {
      buffer = input;
    } else if (typeof input === 'string' && input.startsWith('http')) {
      // Nếu là URL từ Cloudinary, tiến hành tải về RAM dưới dạng mảng byte
      const response = await axios.get(input, { responseType: 'arraybuffer' });
      buffer = Buffer.from(response.data);
    } else {
      return null;
    }

    // Co ảnh về kích thước 8x8 pixel, khử màu về hệ xám (Grayscale)
    const { data } = await sharp(buffer)
      .resize(8, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Tính giá trị xám trung bình của toàn bộ 64 điểm ảnh
    let totalValue = 0;
    for (let i = 0; i < data.length; i++) {
      totalValue += data[i];
    }
    const average = totalValue / data.length;

    // Thiết lập chuỗi bit: Điểm nào sáng hơn trung bình là 1, tối hơn là 0
    let hash = '';
    for (let i = 0; i < data.length; i++) {
      hash += data[i] >= average ? '1' : '0';
    }
    return hash;
  } catch (error) {
    console.error("Lỗi tính toán dấu vân tay ảnh:", error.message);
    return null;
  }
};

/**
 * Hàm tính độ sai lệch giữa 2 chuỗi vân tay (Hamming Distance)
 * Kết quả càng nhỏ (gần về 0) thì 2 ảnh càng giống nhau
 */
const getHammingDistance = (hash1, hash2) => {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 999;
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
};

module.exports = { generateImageHash, getHammingDistance };