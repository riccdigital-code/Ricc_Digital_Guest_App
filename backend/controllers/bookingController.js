const prisma = require("../prisma/client");

const createBooking = async (req, res) => {
  try {
    const { firstName, surname, phone, room } = req.body;

    if (!firstName || !phone) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const newBooking = await prisma.booking.create({
      data: {
        firstName,
        surname,
        phone,
        room,
      },
    });

    console.log("Saved Booking:", newBooking);

    res.json({
      message: "Booking saved successfully",
      data: newBooking,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = { createBooking };