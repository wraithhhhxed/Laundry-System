import appointmentModel from '../../models/appointmentModel.js'

class AppointmentRepository {
  // NOTE: 'services' is an embedded subdocument array, NOT a ref to a separate
  // collection — so .populate('services') was returning null for each item and
  // overwriting valid data (actualKg, kgPrice, etc.) on every refresh.
  // 'clothingTypes' IS a real ref so we keep that populate.

  async findById(id) {
    return await appointmentModel.findById(id).populate('clothingTypes')
  }

  async findByUserId(userId) {
    return await appointmentModel.find({ userId }).populate('clothingTypes')
  }

  async findByBranchId(branchId) {
    return await appointmentModel.find({ branchId }).populate('clothingTypes')
  }

  async findAll() {
    return await appointmentModel.find({}).populate('clothingTypes')
  }

  async create(appointmentData) {
    return await appointmentModel.create(appointmentData)
  }

  async updateById(id, updates) {
    // Use $set so MongoDB only touches the specified fields and never
    // accidentally replaces the entire embedded services array.
    return await appointmentModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    )
  }

  async cancelById(id) {
    return await appointmentModel.findByIdAndUpdate(
      id,
      { $set: { cancelled: true } },
      { new: true }
    )
  }

  async updateDeliveryStatus(id, deliveryStatus) {
    return await appointmentModel.findByIdAndUpdate(
      id,
      { $set: { deliveryStatus } },
      { new: true }
    )
  }

  async markCompleted(id) {
    return await appointmentModel.findByIdAndUpdate(
      id,
      { $set: { isCompleted: true } },
      { new: true }
    )
  }

  // FIX: also set paymentStatus and paymentMethod so the branch portal
  // and client appointments page both reflect the correct paid state.
  // Previously only payment:true was set, leaving paymentStatus as
  // 'pending_payment' which caused the UI to still show "Payment Due".
  async markPaid(id) {
    return await appointmentModel.findByIdAndUpdate(
      id,
      {
        $set: {
          payment:       true,
          paymentStatus: 'paid_online',
          paymentMethod: 'online',
          paymentPaidAt: new Date(),
        }
      },
      { new: true }
    )
  }

  async saveSessionId(id, sessionId) {
    return await appointmentModel.findByIdAndUpdate(
      id,
      { $set: { sessionId } },
      { new: true }
    )
  }
}

export default new AppointmentRepository()