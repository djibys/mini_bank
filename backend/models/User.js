const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const USER_TYPES = {
  CLIENT: "CLIENT",
  DISTRIBUTEUR: "DISTRIBUTEUR",
  AGENT: "AGENT",
};

const userSchema = new mongoose.Schema(
  {
    idUser: { type: String, required: false },
    NcarteIdentite: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    nom: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    prenom: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Email invalide"],
    },
    tel: { type: String, required: true, trim: true },
    adresse: { type: String, required: true, trim: true },
    dateNaissance: { type: Date, required: true },
    pwd: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    photo: { type: String, required: false, default: null },
    qrCode: { type: String, required: false, default: null },
    typeUtilisateur: {
      type: String,
      required: true,
      enum: Object.values(USER_TYPES),
      default: USER_TYPES.CLIENT,
    },
    pwdTemporaire: {
      type: String,
      required: false,
      default: null,
      select: false,
    },
    dateCreation: { type: Date, required: false, default: Date.now },
    numeroCompte: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },
    isBlocked: { type: Boolean, default: false },
    lastLogin: { type: Date, required: false },
  },
  { timestamps: true }
);

// Générer le numéro de compte avant sauvegarde
userSchema.pre("save", async function (next) {
  if (!this.numeroCompte) {
    this.numeroCompte = await generateAccountNumber();
  }

  // Hash password si modifié
  if (this.isModified("pwd")) {
    this.pwd = await bcrypt.hash(this.pwd, 10);
  }

  next();
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.pwd);
};

// Fonction pour générer un numéro de compte unique
async function generateAccountNumber() {
  const prefix = "ACC";
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${prefix}${timestamp}${random}`;
}

module.exports = mongoose.model("User", userSchema);
