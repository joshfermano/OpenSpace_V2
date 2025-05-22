"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
    },
    active: {
        type: Boolean,
        default: true,
    },
    banReason: {
        type: String,
    },
    resetPasswordToken: {
        type: String,
        select: false, // Don't return this field in queries by default
    },
    resetPasswordExpire: {
        type: Date,
        select: false, // Don't return this field in queries by default
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
    },
    profileImage: {
        type: String,
        default: '',
    },
    role: {
        type: String,
        enum: ['user', 'host', 'admin'],
        default: 'user',
    },
    verificationLevel: {
        type: String,
        enum: ['basic', 'verified', 'admin'],
        default: 'basic',
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    isPhoneVerified: {
        type: Boolean,
        default: false,
    },
    isHostVerified: {
        type: Boolean,
        default: false,
    },
    identificationDocument: {
        idType: {
            type: String,
            enum: [
                'Philippine National ID',
                'ePhilID',
                'Passport',
                'LTO Drivers License',
                'SSS Card',
                'GSIS Card',
                'UMID Card',
                'PRC ID',
                'COMELEC Voters ID',
                'Senior Citizen ID',
                'PhilHealth ID',
                'Postal ID',
                'TIN Card',
                'Other',
            ],
        },
        idNumber: { type: String },
        idImage: { type: String },
        uploadDate: { type: Date },
        verificationStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        verificationDate: { type: Date },
        rejectionReason: { type: String },
        businessDocument: {
            certificateType: { type: String },
            certificateNumber: { type: String },
            certificateImage: { type: String },
            uploadDate: { type: Date },
        },
    },
    address: {
        street: { type: String },
        city: { type: String },
        state: { type: String },
        zipCode: { type: String },
        country: { type: String },
    },
    hostInfo: {
        bio: { type: String },
        languagesSpoken: [{ type: String }],
        responseRate: { type: Number },
        responseTime: { type: Number },
        acceptanceRate: { type: Number },
        hostSince: { type: Date },
    },
    savedRooms: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Room' }],
}, {
    timestamps: true,
});
userSchema.statics.getUserVerificationCounts = function () {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Calculating user verification counts...');
            const total = yield this.countDocuments({});
            console.log(`Total users: ${total}`);
            // Get verified users (users with verificationLevel of 'verified' or 'admin')
            const verified = yield this.countDocuments({
                verificationLevel: { $in: ['verified', 'admin'] },
            });
            console.log(`Verified users: ${verified}`);
            // Get banned users
            const banned = yield this.countDocuments({ active: false });
            console.log(`Banned users: ${banned}`);
            // Calculate unverified users (excluding banned users)
            const activeUnverified = yield this.countDocuments({
                verificationLevel: 'basic',
                active: true,
            });
            console.log(`Active unverified users: ${activeUnverified}`);
            return {
                total,
                verified,
                unverified: activeUnverified,
                banned,
            };
        }
        catch (error) {
            console.error('Error in getUserVerificationCounts:', error);
            return {
                total: 0,
                verified: 0,
                unverified: 0,
                banned: 0,
            };
        }
    });
};
userSchema.methods.comparePassword = function (candidatePassword) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield bcryptjs_1.default.compare(candidatePassword, this.password);
        }
        catch (error) {
            throw new Error('Password comparison failed');
        }
    });
};
userSchema.pre('save', function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!this.isModified('password'))
            return next();
        try {
            const salt = yield bcryptjs_1.default.genSalt(10);
            this.password = yield bcryptjs_1.default.hash(this.password, salt);
            next();
        }
        catch (error) {
            next(error);
        }
    });
});
userSchema.methods.comparePassword = function (candidatePassword) {
    return __awaiter(this, void 0, void 0, function* () {
        return bcryptjs_1.default.compare(candidatePassword, this.password);
    });
};
exports.default = mongoose_1.default.model('User', userSchema);
