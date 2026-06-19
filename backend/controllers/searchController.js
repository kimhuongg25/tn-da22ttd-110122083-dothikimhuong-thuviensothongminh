// backend/controllers/searchController.js
const Tesseract = require('tesseract.js');
const Book = require('../models/Book');

exports.searchByImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Vui lòng tải ảnh lên" });

    // Dùng AI để đọc chữ từ bức ảnh bìa sách
    const { data: { text } } = await Tesseract.recognize(req.file.buffer, 'vie'); // 'vie' là Tiếng Việt
    
    // Xử lý chuỗi text lấy được (cắt bớt ký tự nhiễu, lấy dòng dài nhất làm tên sách...)
    const extractedKeywords = text.split('\n')[0].trim(); 

    // Mang từ khóa đó đi tìm kiếm bằng Cấp độ 1
    const books = await Book.find({
      $or: [
        { title: new RegExp(extractedKeywords, 'i') },
        { author: new RegExp(extractedKeywords, 'i') }
      ]
    });

    res.status(200).json({ detectedText: extractedKeywords, results: books });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};