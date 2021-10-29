DROP TABLE IF EXISTS user_info CASCADE;
CREATE TABLE IF NOT EXISTS user_info(
  id BIGSERIAL PRIMARY KEY NOT NULL,
  name VARCHAR(100) PRIMARY KEY,
  email VARCHAR(200) NOT NULL,
  password VARCHAR(200) NOT NULL,
  restaurant_preferences text[],
  movie_preferences text[]
);
