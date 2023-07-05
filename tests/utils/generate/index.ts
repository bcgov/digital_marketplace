import { faker } from "@faker-js/faker";

const getId = faker.string.uuid;
const getDisplayName = faker.internet.displayName;
const getEmail = faker.internet.email;
const getUserName = faker.internet.userName;

export { getId, getDisplayName, getEmail, getUserName };
