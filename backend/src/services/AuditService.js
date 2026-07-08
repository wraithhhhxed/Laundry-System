import AuditRepository from '../repositories/AuditRepository.js';

// Short human-readable label for an appointment, e.g. "#a33ded09"
const apptLabel = (appointment) => {
  const id = String(appointment._id ?? '')
  return id ? `#${id.slice(-8)}` : '(unknown)'
}

class AuditService {
  async log(action, actor = {}, target = {}, branchId = null, before = null, after = null, meta = null) {
    try {
      await AuditRepository.create({
        action,
        actor: {
          userId: actor.userId ?? null,
          name:   actor.name   ?? 'System',
          role:   actor.role   ?? 'system',
        },
        target: {
          type:  target.type  ?? null,
          id:    target.id    ?? null,
          label: target.label ?? null,
        },
        branchId: branchId ?? null,
        before,
        after,
        meta,
      });
    } catch (err) {
      console.error('[AuditService] Failed to write audit log:', err.message);
    }
  }

  // ─── Convenience wrappers ─────────────────────────────────────────────────

  async logStatusChange(actor, appointment, fromStatus, toStatus) {
    await this.log(
      'APPOINTMENT_STATUS_CHANGED',
      actor,
      {
        type:  'Appointment',
        id:    appointment._id,
        label: apptLabel(appointment),
      },
      appointment.branchId,
      { deliveryStatus: fromStatus },
      { deliveryStatus: toStatus },
    );
  }

  async logWeightConfirmed(actor, appointment, before, after) {
    await this.log(
      'APPOINTMENT_WEIGHT_CONFIRMED',
      actor,
      {
        type:  'Appointment',
        id:    appointment._id,
        label: apptLabel(appointment),
      },
      appointment.branchId,
      before,
      after,
    );
  }

  async logPaymentUpdated(actor, appointment, before, after) {
    await this.log(
      'APPOINTMENT_PAYMENT_UPDATED',
      actor,
      {
        type:  'Appointment',
        id:    appointment._id,
        label: apptLabel(appointment),
      },
      appointment.branchId,
      before,
      after,
    );
  }

  async logAppointmentCreated(actor, appointment) {
    await this.log(
      'APPOINTMENT_CREATED',
      actor,
      {
        type:  'Appointment',
        id:    appointment._id,
        label: apptLabel(appointment),
      },
      appointment.branchId,
      null,
      {
        deliveryStatus:         appointment.deliveryStatus,
        preferredPaymentMethod: appointment.preferredPaymentMethod,
        finalAmount:            appointment.finalAmount,
      },
    );
  }

  async logAppointmentCancelled(actor, appointment, reason = null) {
    await this.log(
      'APPOINTMENT_CANCELLED',
      actor,
      {
        type:  'Appointment',
        id:    appointment._id,
        label: apptLabel(appointment),
      },
      appointment.branchId,
      { deliveryStatus: appointment.deliveryStatus },
      { deliveryStatus: 'cancelled' },
      { reason },
    );
  }

  async logLogin(actor, meta = null) {
    await this.log(
      'USER_LOGIN',
      actor,
      { type: 'User', id: actor.userId, label: actor.name },
      null,
      null,
      null,
      meta,
    );
  }

  async logLoginFailed(email, meta = null) {
    await this.log(
      'USER_LOGIN_FAILED',
      { name: email, role: 'unknown' },
      { type: 'User', label: email },
      null,
      null,
      null,
      meta,
    );
  }

  async logLogout(actor) {
    await this.log(
      'USER_LOGOUT',
      actor,
      { type: 'User', id: actor.userId, label: actor.name },
    );
  }

  async logSettingChanged(actor, key, before, after) {
    await this.log(
      'SETTING_CHANGED',
      actor,
      { type: 'Setting', label: key },
      null,
      { [key]: before },
      { [key]: after },
    );
  }

  async logInventoryUpdated(actor, item, before, after, branchId) {
    await this.log(
      'INVENTORY_UPDATED',
      actor,
      { type: 'Inventory', id: item._id, label: item.name ?? String(item._id) },
      branchId,
      before,
      after,
    );
  }

  async logInventoryCreated(actor, item, branchId) {
    await this.log(
      'INVENTORY_CREATED',
      actor,
      { type: 'Inventory', id: item._id, label: item.name ?? String(item._id) },
      branchId,
      null,
      item,
    );
  }

  async logInventoryDeleted(actor, item, branchId) {
    await this.log(
      'INVENTORY_DELETED',
      actor,
      { type: 'Inventory', id: item._id, label: item.name ?? String(item._id) },
      branchId,
      item,
      null,
    );
  }

  async logBranchCreated(actor, branch) {
    await this.log(
      'BRANCH_CREATED',
      actor,
      { type: 'Branch', id: branch._id, label: branch.name ?? String(branch._id) },
      branch._id,
      null,
      { name: branch.name },
    );
  }

  async logBranchUpdated(actor, branch, before, after) {
    await this.log(
      'BRANCH_UPDATED',
      actor,
      { type: 'Branch', id: branch._id, label: branch.name ?? String(branch._id) },
      branch._id,
      before,
      after,
    );
  }

  async logUserCreated(actor, user) {
    await this.log(
      'USER_CREATED',
      actor,
      { type: 'User', id: user._id, label: user.name ?? user.email },
      user.branchId ?? null,
      null,
      { name: user.name, email: user.email, role: user.role },
    );
  }

  async logUserUpdated(actor, user, before, after) {
    await this.log(
      'USER_UPDATED',
      actor,
      { type: 'User', id: user._id, label: user.name ?? user.email },
      user.branchId ?? null,
      before,
      after,
    );
  }

  async logUserDeleted(actor, user) {
    await this.log(
      'USER_DELETED',
      actor,
      { type: 'User', id: user._id, label: user.name ?? user.email },
      user.branchId ?? null,
      { name: user.name, email: user.email, role: user.role },
      null,
    );
  }
}

export default new AuditService();