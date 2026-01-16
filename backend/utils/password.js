import bcrypt from "bcrypt";

// utilty functions for encrypting and decrypting passwords

const hashPassword = (password) => {
    return bcrypt.hash(password, 10);
};

const decodePassword = (hashedPass, password) => {
    return bcrypt.compare(password, hashedPass);
};



export { hashPassword, decodePassword };