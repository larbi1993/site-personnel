const nodemailer = require("nodemailer");

async function testEmail() {
  let testAccount = await nodemailer.createTestAccount();

  console.log(testAccount);
}

testEmail();
