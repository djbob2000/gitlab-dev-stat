import { PrismaClient, TrackedDeveloper } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateTrackedDeveloperData {
  username: string;
}

export interface UpdateTrackedDeveloperData {
  username?: string;
}

/**
 * Creates a new tracked developer
 */
export const createTrackedDeveloper = async (
  data: CreateTrackedDeveloperData
): Promise<TrackedDeveloper> => {
  return prisma.trackedDeveloper.create({
    data: {
      username: data.username,
    },
  });
};

/**
 * Gets all tracked developers
 */
export const getAllTrackedDevelopers = async (): Promise<TrackedDeveloper[]> => {
  return prisma.trackedDeveloper.findMany({
    orderBy: {
      username: 'asc',
    },
  });
};

/**
 * Gets a tracked developer by ID
 */
export const getTrackedDeveloperById = async (
  id: number
): Promise<TrackedDeveloper | null> => {
  return prisma.trackedDeveloper.findUnique({
    where: {
      id,
    },
  });
};

/**
 * Gets a tracked developer by username
 */
export const getTrackedDeveloperByUsername = async (
  username: string
): Promise<TrackedDeveloper | null> => {
  return prisma.trackedDeveloper.findUnique({
    where: {
      username,
    },
  });
};

/**
 * Updates a tracked developer
 */
export const updateTrackedDeveloper = async (
  id: number,
  data: UpdateTrackedDeveloperData
): Promise<TrackedDeveloper> => {
  return prisma.trackedDeveloper.update({
    where: {
      id,
    },
    data,
  });
};

/**
 * Deletes a tracked developer
 */
export const deleteTrackedDeveloper = async (
  id: number
): Promise<TrackedDeveloper> => {
  return prisma.trackedDeveloper.delete({
    where: {
      id,
    },
  });
};

/**
 * Gets usernames of all tracked developers
 */
export const getTrackedDeveloperUsernames = async (): Promise<string[]> => {
  const developers = await getAllTrackedDevelopers();
  return developers.map(dev => dev.username);
}; 