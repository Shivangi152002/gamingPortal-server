import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.resolve(__dirname, '../data/users.json');

// Ensure data directory exists
const ensureDataDir = async () => {
  const dir = path.dirname(USERS_FILE);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
};

// Initialize users file if it doesn't exist
const initUsersFile = async () => {
  try {
    await fs.access(USERS_FILE);
  } catch {
    await ensureDataDir();
    await fs.writeFile(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
  }
};

// Read users from file
export const readUsers = async () => {
  await initUsersFile();
  try {
    const data = await fs.readFile(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return { users: [] };
  }
};

// Write users to file
export const writeUsers = async (usersData) => {
  await ensureDataDir();
  await fs.writeFile(USERS_FILE, JSON.stringify(usersData, null, 2), 'utf-8');
};

// Get root user from environment
export const getRootUser = () => {
  return {
    username: process.env.ROOT_USERNAME || 'root',
    email: process.env.ROOT_EMAIL || 'root@admin.com',
    password: process.env.ROOT_PASSWORD || 'root123',
    role: 'root'
  };
};

// Authenticate user (root or regular user)
export const authenticateUser = async (email, password) => {
  const rootUser = getRootUser();
  
  // Check if root user
  if (email === rootUser.email && password === rootUser.password) {
    return {
      username: rootUser.username,
      email: rootUser.email,
      role: 'root'
    };
  }
  
  // Check regular users
  const usersData = await readUsers();
  const user = usersData.users.find(u => u.email === email);
  
  if (!user) {
    return null;
  }
  
  // Compare password (hashed)
  const isValid = await bcrypt.compare(password, user.password);
  
  if (!isValid) {
    return null;
  }
  
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role || 'user'
  };
};

// Add new user (by admin)
export const addUser = async (username, email, password, role = 'user') => {
  const usersData = await readUsers();
  
  // Check if email already exists
  const existingUser = usersData.users.find(u => u.email === email);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const newUser = {
    id: `user_${Date.now()}`,
    username,
    email,
    password: hashedPassword,
    role,
    createdAt: new Date().toISOString()
  };
  
  usersData.users.push(newUser);
  await writeUsers(usersData);
  
  // Return user without password
  const { password: _, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
};

// Update user
export const updateUser = async (userId, updates) => {
  const usersData = await readUsers();
  const userIndex = usersData.users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    throw new Error('User not found');
  }
  
  // If password is being updated, hash it
  if (updates.password) {
    updates.password = await bcrypt.hash(updates.password, 10);
  }
  
  usersData.users[userIndex] = {
    ...usersData.users[userIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  await writeUsers(usersData);
  
  const { password: _, ...userWithoutPassword } = usersData.users[userIndex];
  return userWithoutPassword;
};

// Delete user
export const deleteUser = async (userId) => {
  const usersData = await readUsers();
  const userIndex = usersData.users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    throw new Error('User not found');
  }
  
  const deletedUser = usersData.users[userIndex];
  usersData.users.splice(userIndex, 1);
  await writeUsers(usersData);
  
  return deletedUser;
};

// Get all users (without passwords)
export const getAllUsers = async () => {
  const usersData = await readUsers();
  return usersData.users.map(({ password, ...user }) => user);
};
