import { fakerEN_CA as faker } from "@faker-js/faker";

const getId = faker.string.uuid;
const getFullName = faker.person.fullName;
const getEmail = faker.internet.email;
const getUserName = faker.internet.userName;
const getPhoneNumber = faker.phone.number;

export { getId, getFullName, getEmail, getUserName, getPhoneNumber };
