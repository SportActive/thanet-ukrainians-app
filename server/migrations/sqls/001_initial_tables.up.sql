-- 001_initial_tables.up.sql

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'Volunteer' NOT NULL, -- Admin, Organizer, Volunteer
    phone_number VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    has_car BOOLEAN DEFAULT FALSE,
    skills_list JSONB DEFAULT '[]'
);

CREATE TABLE events (
    event_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) DEFAULT 'Social',
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP,
    description TEXT,
    location_name VARCHAR(255),
    organizer_id INTEGER REFERENCES users(user_id),
    is_published BOOLEAN DEFAULT FALSE NOT NULL
);

CREATE TABLE tasks (
    task_id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(event_id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    required_volunteers INTEGER DEFAULT 1,
    signed_up_volunteers INTEGER DEFAULT 0,
    deadline_time TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Open'
);

CREATE TABLE volunteer_signups (
    signup_id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(task_id) ON DELETE CASCADE NOT NULL,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE NOT NULL,
    UNIQUE (task_id, user_id)
);