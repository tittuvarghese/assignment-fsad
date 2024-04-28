USE language-learning-db;

CREATE TABLE users (
  user_id VARCHAR(100) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  user_type ENUM('admin', 'user') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE supported_languages (
  language_id VARCHAR(36) PRIMARY KEY,
  foreign_language VARCHAR(100) NOT NULL,
  base_language VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE learning_materials (
    content_id VARCHAR(40) PRIMARY KEY,
    language_id VARCHAR(40),
    content_type ENUM('image', 'video', 'audio', 'text'),
    foreign_word VARCHAR(255),
    base_word VARCHAR(255),
    creator_id VARCHAR(100),
    difficulty_level ENUM('beginner', 'intermediate', 'advanced'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
