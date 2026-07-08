import Setting from '../../models/settingModel.js'

export const getSettingByKey = async (key) => {
  return await Setting.findOne({ key })
}

export const upsertSetting = async (key, value, description = '') => {
  return await Setting.findOneAndUpdate(
    { key },
    { value, description },
    { upsert: true, new: true }
  )
}

export const getAllSettings = async () => {
  return await Setting.find({})
}