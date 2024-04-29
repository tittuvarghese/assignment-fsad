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
    weightage INT,
    difficulty_level ENUM('beginner', 'intermediate', 'advanced'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assessment (
    assessment_id VARCHAR(40) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    duration_allowed INT DEFAULT 30, -- Duration allowed in minutes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assessment_questions (
    assessment_id VARCHAR(40),
    question_id VARCHAR(40),
    weightage INT,
    PRIMARY KEY (assessment_id, question_id),
    FOREIGN KEY (assessment_id) REFERENCES assessment(assessment_id),
    FOREIGN KEY (question_id) REFERENCES learning_materials(content_id)
);