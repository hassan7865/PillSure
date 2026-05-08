import assert from "node:assert/strict";
import { __agenticChatbotTestables } from "../services/agenticChatbot.service";
import { isAppointmentStartInDiscreteHalfHourSlots } from "../utils/affiliationHalfHourSlots.util";

const {
  runtimeServicesToPromptBlock,
  findRuntimeServicesByNameLoose,
  mapBookingErrorToUserText,
  validateBookingInput,
  alignWeekdayLabelsWithYmd,
  filterAffiliationsByContext,
  formatWeeklyScheduleForPrompt,
  isLikelyNewBookingRequest,
} = __agenticChatbotTestables;

const scopedServices = [
  {
    doctorId: "d1",
    practiceAffiliationId: "a1",
    doctorServiceId: "s1",
    serviceName: "General Checkup",
    durationMinutes: 30,
    pricePkr: 1500,
  },
  {
    doctorId: "d2",
    practiceAffiliationId: "a2",
    doctorServiceId: "s2",
    serviceName: "General Checkup",
    durationMinutes: 30,
    pricePkr: 1200,
  },
  {
    doctorId: "d2",
    practiceAffiliationId: "a2",
    doctorServiceId: "s3",
    serviceName: "Mental Health Consultation",
    durationMinutes: 45,
    pricePkr: 2500,
  },
];

const run = () => {
  // unit: runtime resolver helpers
  {
    const block = runtimeServicesToPromptBlock(scopedServices);
    assert.ok(block.includes("General Checkup"));
    assert.ok(block.includes("price_from_pkr: 1200"));
    assert.ok(block.includes("available_with_doctors: 2"));
    assert.ok(block.includes("Mental Health Consultation"));
  }

  {
    const mental = findRuntimeServicesByNameLoose(scopedServices, "mental health consultation");
    assert.equal(mental.length, 1);
    assert.equal(mental[0].serviceName, "Mental Health Consultation");

    const checkup = findRuntimeServicesByNameLoose(scopedServices, "checkup");
    assert.ok(checkup.length >= 2);
  }

  {
    const msg = mapBookingErrorToUserText("Requested time is outside hours for this practice site");
    assert.ok(msg.startsWith("slot_outside_affiliation_hours"));
  }

  {
    const corrected = alignWeekdayLabelsWithYmd("Friday, 2026-04-26", "UTC");
    assert.equal(corrected, "Sunday, 2026-04-26");
  }

  {
    const rows = [
      { id: "a1", doctorId: "d1", kind: "private", hospitalId: null },
      { id: "a2", doctorId: "d1", kind: "hospital", hospitalId: "h1" },
      { id: "a3", doctorId: "d2", kind: "hospital", hospitalId: "h2" },
    ] as any;
    const doctorScoped = filterAffiliationsByContext(rows, {
      ownerUserId: "u1",
      defaultDoctorId: "d1",
      allowedDoctorIds: null,
      hospitalId: null,
    });
    assert.deepEqual(doctorScoped.map((x: any) => x.id), ["a1"]);

    const hospitalScoped = filterAffiliationsByContext(rows, {
      ownerUserId: "u2",
      defaultDoctorId: null,
      allowedDoctorIds: ["d1", "d2"],
      hospitalId: "h1",
    });
    assert.deepEqual(hospitalScoped.map((x: any) => x.id), ["a2"]);
  }

  {
    const block = formatWeeklyScheduleForPrompt({
      bookableHalfHourSlotsByWeekday: {
        monday: ["17:00", "08:00", "17:00"],
        tuesday: ["10:00"],
      },
    } as any);
    assert.ok(block.includes("monday"));
    assert.ok(block.includes("08:00"));
    assert.ok(block.includes("17:00"));
    assert.ok(block.includes("tuesday"));
    assert.ok(block.includes("10:00"));
  }

  {
    assert.equal(isLikelyNewBookingRequest("I wanna make another appointment"), true);
    assert.equal(isLikelyNewBookingRequest("show my upcoming appointments"), false);
  }

  {
    const sundayBlocked = isAppointmentStartInDiscreteHalfHourSlots(
      "sunday",
      "09:00",
      30,
      {
        openingTime: "00:00",
        closingTime: "23:59",
        availableDays: ["Monday", "Tuesday", "Sunday"],
        bookableHalfHourSlotsByWeekday: {
          monday: ["09:00", "09:30"],
          tuesday: ["10:00", "10:30"],
        },
      } as any
    );
    assert.equal(sundayBlocked, false);
  }

  // integration-style: booking validation + matching flow
  {
    const result = validateBookingInput({
      confidence: 95,
      explicitlyConfirmed: false,
      appointmentDate: "2099-05-30",
      appointmentTime: "15:00",
      consultationMode: "inperson",
      patientFirstName: "Ali",
      serviceName: "General Checkup",
      clinicTz: "Asia/Karachi",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "needs_explicit_confirmation");
  }

  {
    const result = validateBookingInput({
      confidence: 95,
      explicitlyConfirmed: true,
      appointmentDate: "2099-05-30",
      appointmentTime: "15:00",
      consultationMode: "online",
      patientFirstName: "Ali",
      serviceName: "General Checkup",
      clinicTz: "Asia/Karachi",
    });
    assert.equal(result.ok, true);
  }

  // scripted e2e scenarios: high-variance user queries
  {
    const matches = findRuntimeServicesByNameLoose(scopedServices, "doctor consultation");
    assert.equal(matches.length, 0);
  }

  {
    const result = validateBookingInput({
      confidence: 88,
      explicitlyConfirmed: true,
      appointmentDate: "2099-05-30",
      appointmentTime: null,
      consultationMode: "inperson",
      patientFirstName: "Ali",
      serviceName: "Mental Health Consultation",
      clinicTz: "Asia/Karachi",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "missing_datetime_mode");
  }

  {
    const result = validateBookingInput({
      confidence: 92,
      explicitlyConfirmed: true,
      appointmentDate: "2099-11-11",
      appointmentTime: "10:30",
      consultationMode: "inperson",
      patientFirstName: "Hassan",
      serviceName: "General Checkup",
      clinicTz: "Asia/Karachi",
    });
    assert.equal(result.ok, true);
  }
};

run();
console.log("whatsapp-booking.spec: all checks passed");
