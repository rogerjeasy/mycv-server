const express = require('express');
const OpenAI = require('openai');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
const pdfParse = require('pdf-parse');
const fs = require('fs');

dotenv.config();

const app = express();
const port = 5000;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Welcome to the Express server!');
});

app.post('/api/chat', async (req, res) => {
  const { prompt } = req.body;

  try {
      const pdfPath = './files/roger_updated_cv.pdf'; 
      const pdfBuffer = fs.readFileSync(pdfPath); 

      const data = await pdfParse(pdfBuffer);
      const pdfText = data.text; 

      const modifiedPrompt = `According to the following information: "${pdfText}". For any question not related to the information in the document, clearly say you do not know about it. ${prompt}`;

      const completion = await openai.chat.completions.create({
          messages: [
              { role: "system", content: "You are a helpful assistant." },
              { role: "user", content: modifiedPrompt }
          ],
          model: "gpt-3.5-turbo",
      });

      res.json({ response: completion.choices[0].message.content });
  } catch (error) {
      console.error('Error processing PDF or fetching response from OpenAI:', error);
      res.status(500).json({ error: error.message });
  }
});

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const verifyRecaptcha = async (token) => {
    const response = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`
    });
  
    const data = await response.json();
    return data.success;
  };
  
  app.post('/send-email', (req, res) => {
    const { firstName, lastName, phone, email, message } = req.body;
  
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'rogerjeasy@gmail.com',
      subject: `Website Form: New message from ${firstName} ${lastName}`,
      text: `
        Name: ${firstName} ${lastName}
        Phone: ${phone}
        Email: ${email}
        Message: ${message}
      `,
    };
  
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        res.status(500).send(`Error sending email: ${error.message}`);
      } else {
        console.log('Email sent:', info.response);
        res.status(200).send('Email sent successfully');
      }
    });
  });

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
