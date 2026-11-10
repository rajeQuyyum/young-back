require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const multer =
  require("multer");

const cloudinary =
  require("cloudinary").v2;

const app = express();

const storage =
  multer.memoryStorage();

const upload =
  multer({
    storage,
  });

cloudinary.config({

  cloud_name:
    process.env.CLOUDINARY_CLOUD_NAME,

  api_key:
    process.env.CLOUDINARY_API_KEY,

  api_secret:
    process.env.CLOUDINARY_API_SECRET,

});


// ================== CORS ==================
app.use(cors());

app.use(express.json());


// ================== TEST ROUTE ==================
app.get("/", (req, res) => {

  res.send("Backend Working");

});


// ================== DATABASE ==================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {

    console.log("MongoDB Connected");

  })
  .catch((err) => {

    console.log("Mongo Error:");

    console.log(err);

  });


// ================== SHIPMENT SCHEMA ==================
const shipmentSchema = new mongoose.Schema({

  trackingNumber: String,

  recipientName: String,

  createdAt: String,

  shippingAddress: String,

  destinationAddress: String,

  currentLocation: String,

  events: Array,

  shippingMap: {

  currentStep: {
    type: Number,
    default: 0,
  },

  estimatedArrival: {
    type: String,
    default: "",
  },

  redStop: {
    enabled: {
      type: Boolean,
      default: false,
    },

    title: {
      type: String,
      default: "",
    },
  },

  steps: {
    type: [String],

    default: [
      "Invoice Created",
      "Ready for Transit",
      "On the Way",
      "Out for Delivery",
      "Delivered",
    ],
  },
},
});

const Shipment = mongoose.model(
  "Shipment",
  shipmentSchema
);


// ================== CHAT SCHEMA ==================
const chatSchema = new mongoose.Schema({
  email: String,
  tracking: String,
  message: String,
  from: String,
  time: String,
  image: String,

  seen: {
    type: Boolean,
    default: false,
  },

  seenAt: {
    type: String,
    default: "",
  },
});

const Chat = mongoose.model(
  "Chat",
  chatSchema
);


// ================== ADMIN LOGIN ==================
app.post("/admin-login", async (req, res) => {

  try {

    const { password } = req.body;

    if (!password) {

      return res.status(400).json({
        success: false,
        message: "Password required",
      });

    }

    if (
      password ===
      process.env.ADMIN_PASSWORD
    ) {

      return res.status(200).json({
        success: true,
      });

    }

    return res.status(401).json({
      success: false,
      message: "Wrong password",
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });

  }

});


// ================== GET ALL SHIPMENTS ==================
app.get("/shipments", async (req, res) => {

  try {

    const shipments =
      await Shipment.find().sort({
        createdAt: -1,
      });

    res.json(shipments);

  } catch (err) {

    console.log(err);

    res.status(500).json(err);

  }

});


// ================== CREATE SHIPMENT ==================
app.post("/create-shipment", async (req, res) => {

  try {

    const shipment =
      new Shipment(req.body);

    await shipment.save();

    res.json({
      success: true,
      shipment,
    });

  } catch (err) {

    console.log(err);

    res.status(500).json(err);

  }

});


// ================== GET SINGLE SHIPMENT ==================
app.get("/track/:trackingNumber", async (req, res) => {

  try {

    const shipment =
      await Shipment.findOne({
        trackingNumber:
          req.params.trackingNumber,
      });

    res.json(shipment);

  } catch (err) {

    console.log(err);

    res.status(500).json(err);

  }

});


// ================== ADD EVENT ==================
app.post("/add-event/:trackingNumber", async (req, res) => {

  try {

    const shipment =
      await Shipment.findOne({
        trackingNumber:
          req.params.trackingNumber,
      });

    if (!shipment) {

      return res.status(404).json({
        success: false,
        message:
          "Shipment not found",
      });

    }

    shipment.events.push(req.body);

    await shipment.save();

    res.json(shipment);

  } catch (err) {

    console.log(err);

    res.status(500).json(err);

  }

});


// ================== DELETE SHIPMENT ==================
app.delete("/delete/:trackingNumber", async (req, res) => {

  try {

    await Shipment.deleteOne({
      trackingNumber:
        req.params.trackingNumber,
    });

    res.json({
      success: true,
    });

  } catch (err) {

    console.log(err);

    res.status(500).json(err);

  }

});

app.put(
  "/update-shipment/:trackingNumber",
  async (req, res) => {

    try {

      const shipment =
        await Shipment.findOneAndUpdate(
          {
            trackingNumber:
              req.params
                .trackingNumber,
          },
          req.body,
          {
            new: true,
          }
        );

      res.json(shipment);

    } catch (err) {

      console.log(err);

      res.status(500).json(err);

    }

  }
);


// ================== GET CHATS ==================
app.get("/chats", async (req, res) => {

  try {

    const chats =
      await Chat.find().sort({
        time: 1,
      });

    res.json(chats);

  } catch (err) {

    console.log(err);

    res.status(500).json(err);

  }

});


// ================== SAVE CHAT ==================
app.post("/chat", async (req, res) => {

  try {

    const chat =
      new Chat(req.body);

    await chat.save();

    res.json(chat);

  } catch (err) {

    console.log(err);

    res.status(500).json(err);

  }

});



app.post(
  "/clear-chat",
  async (req, res) => {

    try {

      const {
        key,
      } = req.body;

      const [
        email,
        tracking,
      ] = key.split("||");

      await Chat.deleteMany({
        email,
        tracking,
      });

      res.json({
        success: true,
      });

    } catch (err) {

      console.log(err);

      res.status(500).json({
        success: false,
      });

    }

  }
);

app.delete(
  "/delete-message/:id",
  async (req, res) => {

    try {

      await Chat.findByIdAndDelete(
        req.params.id
      );

      res.json({
        success: true,
      });

    } catch (err) {

      console.log(err);

      res.status(500).json({
        success: false,
      });

    }

  }
);


app.post(
  "/upload-image",

  upload.single("image"),

  async (req, res) => {

    try {

      if (!req.file) {

        return res.status(400).json({
          success: false,
          message: "No image selected",
        });

      }

      const b64 =
        Buffer.from(
          req.file.buffer
        ).toString("base64");

      const dataURI = `data:${req.file.mimetype};base64,${b64}`;

      const result =
        await cloudinary.uploader.upload(
          dataURI,
          {
            folder:
              "shipflow-chat",
          }
        );

      res.json({

        success: true,

        image:
          result.secure_url,

      });

    } catch (err) {

      console.log(
        "UPLOAD ERROR:",
        err
      );

      res.status(500).json({
        success: false,
        error: err.message,
      });

    }

  }
);


app.put(
  "/mark-read",
  async (req, res) => {

    try {

      const {
        email,
        tracking,
      } = req.body;

      await Chat.updateMany(
  {
    email,
    tracking,
    from: "admin",
    seen: false,
  },
  {
    $set: {
      seen: true,
      seenAt: new Date().toISOString(),
    },
  }
);

      res.json({
        success: true,
      });

    } catch (err) {

      console.log(err);

      res.status(500).json({
        success: false,
      });

    }

  }
);

// ================== START SERVER ==================
app.listen(
  process.env.PORT || 1200,
  () => {

    console.log(
      "Server running on port 1200"
    );

  }
);