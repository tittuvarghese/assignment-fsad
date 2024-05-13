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

CREATE TABLE challenges (
    challenge_id VARCHAR(40) PRIMARY KEY,
    challenge_name VARCHAR(255) NOT NULL,
    difficulty_level ENUM('beginner', 'intermediate', 'advanced'),
    language_id VARCHAR(40),
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

CREATE TABLE assessment (
    assessment_id VARCHAR(40) PRIMARY KEY,
    language_id VARCHAR(40),
    user_id VARCHAR(100) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    duration_allowed INT DEFAULT 30, -- Duration allowed in minutes
    difficulty_level ENUM('beginner', 'intermediate', 'advanced'),
    progress INT DEFAULT 0,
    total_questions INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    challenge_id VARCHAR(40),
    FOREIGN KEY (challenge_id) REFERENCES challenges(challenge_id)
);

CREATE TABLE assessment_questions (
    assessment_id VARCHAR(40),
    question_id VARCHAR(40),
    foreign_word VARCHAR(255),
    base_word VARCHAR(255),
    weightage INT,
    completed BOOLEAN DEFAULT false,
    PRIMARY KEY (assessment_id, question_id),
    FOREIGN KEY (assessment_id) REFERENCES assessment(assessment_id),
    FOREIGN KEY (question_id) REFERENCES learning_materials(content_id)
);

INSERT into challenges (challenge_id, challenge_name, difficulty_level,created_by) VALUES ("0", "Default", "beginner", "c1cfb3e4-0b84-45ee-a78b-a2a67cdbf458");
-- ALTER TABLE assessment ADD updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
