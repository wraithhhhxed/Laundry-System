// backend/src/repositories/settingRepository.js
import prisma from '../config/prismaClient.js';

export const getSettingByKey = async (key) => {
  return await prisma.setting.findUnique({ where: { key } });
};

export const upsertSetting = async (key, value, description = '') => {
  return await prisma.setting.upsert({
    where: { key },
    update: { value, description },
    create: { key, value, description },
  });
};

export const getAllSettings = async () => {
  return await prisma.setting.findMany();
};