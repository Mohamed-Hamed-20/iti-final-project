import { Types } from "mongoose";

export const SignUpTemplet = (link: string) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Email Confirmation</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f5f5f5; font-family: Arial, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <!-- Main Container -->
      <tr>
        <td align="center" bgcolor="#f5f5f5" style="padding: 20px 0;">
          <table border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; background-color: #ffffff; border: 2px solid #000000; border-radius: 10px;">
            
            <!-- Logo Section -->
            <tr>
              <td align="center" style="padding: 40px 20px 20px 20px;">
              </td>
            </tr>
            
            <!-- Confirmation Message -->
            <tr>
              <td align="center" style="padding: 20px 30px;">
                <h2 style="color: #333333; font-size: 24px; margin: 0 0 20px 0;">Please Confirm Your Email Address</h2>
                <p style="color: #555555; font-size: 16px; line-height: 24px; margin: 0 0 30px 0;">
                  Thank you for registering with us! To complete your registration, please confirm your email address by clicking the button below.
                </p>
                <!-- Confirmation Button -->
                <a href="${link}" target="_blank" style="background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 25px; font-size: 16px; display: inline-block; border: 2px solid #000000;">
                  Confirm Email
                </a>
              </td>
            </tr>
            
            <!-- Footer Section -->
            <tr>
              <td align="center" style="padding: 20px 30px; background-color: #f9f9f9; border-top: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
                <p style="color: #888888; font-size: 12px; margin: 0;">
                  If you did not create an account, no further action is required.
                </p>
                <p style="color: #888888; font-size: 12px; margin: 5px 0 0 0;">
                  &copy; ${new Date().getFullYear()} <strong>Edrasa</strong>. All rights reserved.
                </p>
              </td>
            </tr>
            
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

export const successTemplet = () => {
  return `
  <!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Successful</title>
  <link rel="stylesheet" href="style.css" />
  <script src="https://kit.fontawesome.com/a076d05399.js" crossorigin="anonymous"></script>
</head>
<style>
  body {
    margin: 0;
    font-family: Arial, sans-serif;
    background-color: #f9fafb;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 48px 16px;
  }

  .container {
    max-width: 400px;
    width: 100%;
    text-align: center;
  }

  .icon-section {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .success-icon {
    font-size: 96px;
    color: #22c55e;
    margin-bottom: 24px;
  }

  .title {
    margin-top: 24px;
    font-size: 28px;
    font-weight: bold;
    color: #111827;
  }

  .subtitle {
    margin-top: 8px;
    font-size: 14px;
    color: #6b7280;
  }

  .extra-info {
    margin-top: 32px;
  }

  .email-info {
    font-size: 14px;
    color: #6b7280;
    margin-bottom: 16px;
  }

  .button-group {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  @media (min-width: 640px) {
    .button-group {
      flex-direction: row;
      justify-content: center;
    }
  }

  .btn {
    padding: 12px 20px;
    font-size: 16px;
    font-weight: 500;
    border-radius: 6px;
    text-decoration: none;
    display: inline-block;
    text-align: center;
  }

  .btn-primary {
    background-color: #410445;
    color: white;
    border: none;
  }

  .btn-primary:hover {
    background-color: #5b21b6;
  }

  .btn-secondary {
    background-color: white;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .btn-secondary:hover {
    background-color: #f9fafb;
  }
</style>

<body>
  <div class="container">
    <div class="content">
      <div class="icon-section">
        <i class="fas fa-check-circle success-icon"></i>
        <h2 class="title">Payment Successful!</h2>
        <p class="subtitle">
          Thank you for your purchase. Your payment has been processed successfully.
        </p>
      </div>
      <div class="extra-info">
        <p class="email-info">
          A confirmation email has been sent to your registered email address.
        </p>
        <div class="button-group">
          <a href="/dashboard/main" class="btn btn-primary">Go to Dashboard</a>
          <a href="/courses" class="btn btn-secondary">Browse More Courses</a>
        </div>
      </div>
    </div>
  </div>
</body>

</html>`;
};

export const approveInstructorTemplate = () => {
  return `
  <!DOCTYPE html>
  <html lang="en" style="margin: 0; padding: 0;">
  
  <head>
    <meta charset="UTF-8" />
    <title>Instructor Account Approved</title>
  </head>
  
  <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f9f9; margin: 0; padding: 0;">
    <table width="100%" cellspacing="0" cellpadding="0" style="padding: 40px 0;">
      <tr>
        <td align="center">
          <table width="600"
            style="background-color: #ffffff; border-radius: 10px; overflow: hidden; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <tr>
              <td align="center">
                <h1 style="color: #410445; margin-bottom: 20px;">Congratulations!</h1>
                <p style="font-size: 16px; color: #333; line-height: 1.6;">
                  You've officially been approved as an instructor on <strong>Edrasa</strong>.
                </p>
                <p style="font-size: 14px; color: #555; line-height: 1.6; margin-top: 10px;">
                  We're thrilled to have you on board, ready to share your knowledge and empower learners around the world.
                </p>
  
                <table width="100%" style="margin: 30px 0;">
                  <tr>
                    <td align="center">
                      <table cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding: 0 8px;">
                            <a href="/dashboard/main"
                              style="display: inline-block; padding: 12px 30px; background-color: #410445; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">Go
                              to Dashboard</a>
                          </td>
                          <td style="padding: 0 8px;">
                            <a href="/courses"
                              style="display: inline-block; padding: 12px 30px; background-color: #fff; color: #410445; text-decoration: none; border-radius: 6px; font-weight: bold; border: 1px solid #410445;">Browse
                              More Courses</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top: 40px;">
                <p style="font-size: 13px; color: #aaaaaa;">
                  &copy; ${new Date().getFullYear()} <strong>Edrasa</strong>. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  
  </html>`;
};

export const approveCourseTemplate = () => {
  return `
  <!DOCTYPE html>
  <html lang="en" style="margin: 0; padding: 0;">
  
  <head>
    <meta charset="UTF-8" />
    <title>Course Approved</title>
  </head>
  
  <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f9f9; margin: 0; padding: 0;">
    <table width="100%" cellspacing="0" cellpadding="0" style="padding: 40px 0;">
      <tr>
        <td align="center">
          <table width="600"
            style="background-color: #ffffff; border-radius: 10px; overflow: hidden; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <tr>
              <td align="center">
                <h1 style="color: #410445; margin-bottom: 20px;">Course Approved!</h1>
                <p style="font-size: 16px; color: #333; line-height: 1.6;">
                  Great news! Your course has been successfully reviewed and approved on <strong>Edrasa</strong>.
                </p>
                <p style="font-size: 14px; color: #555; line-height: 1.6; margin-top: 20px;">
                  Your course is now live and accessible to learners across the platform. Get ready to make an impact and inspire others with your knowledge!
                </p>
  
                <table width="100%" style="margin: 30px 0;">
                  <tr>
                    <td align="center">
                      <table cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding: 0 8px;">
                            <a href="/dashboard/main"
                              style="display: inline-block; padding: 12px 30px; background-color: #410445; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">Go
                              to Dashboard</a>
                          </td>
                          <td style="padding: 0 8px;">
                            <a href="/courses"
                              style="display: inline-block; padding: 12px 30px; background-color: #fff; color: #410445; text-decoration: none; border-radius: 6px; font-weight: bold; border: 1px solid #410445;">Browse
                              More Courses</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
  
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top: 40px;">
                <p style="font-size: 13px; color: #aaaaaa;">
                  &copy; ${new Date().getFullYear()} <strong>Edrasa</strong>. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  
  </html>`;
};

export const canceledTemplet = () => {
  return `
  <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Payment Declined</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"/>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f9fafb;
      font-family: Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .container {
      max-width: 400px;
      width: 100%;
      padding: 24px;
      background-color: white;
      text-align: center;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .icon {
      font-size: 96px;
      color: #ef4444;
      margin-bottom: 24px;
    }

    h2 {
      font-size: 28px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 8px;
    }

    p {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 16px;
    }

    .buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 20px;
    }

    .btn {
      display: inline-block;
      padding: 12px 20px;
      font-size: 16px;
      font-weight: 500;
      border-radius: 6px;
      text-decoration: none;
      text-align: center;
      transition: 0.3s ease;
    }

    .btn-primary {
      background-color: #410445;
      color: white;
      border: none;
    }

    .btn-primary:hover {
      background-color: #5b21b6;
    }

    .btn-secondary {
      background-color: white;
      border: 1px solid #d1d5db;
      color: #374151;
    }

    .btn-secondary:hover {
      background-color: #f3f4f6;
    }

    .support-link {
      margin-top: 24px;
    }

    .support-link a {
      color: #410445;
      text-decoration: none;
      font-weight: 500;
    }

    .support-link a:hover {
      color: #5b21b6;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <i class="fas fa-exclamation-circle"></i>
    </div>
    <h2>Payment Declined</h2>
    <p>We're sorry, but your payment could not be processed at this time.</p>
    <p>Please check your payment details and try again, or contact your bank for assistance.</p>
    <div class="buttons">
      <a href="/checkout" class="btn btn-primary">Try Again</a>
      <a href="/cart" class="btn btn-secondary">Return to Cart</a>
    </div>
  </div>
</body>
</html>
`;
};

type PaymentParameter = {
  name?: string;
  courseTitle?: string;
  courseImage?: string;
  transactionId?: Types.ObjectId;
  paymentDate?: Date;
  amountPaid?: number;
  dashboardLink?: string;
  contactLink?: string;
  year?: string;
};

export const purchaseEmail = (param: PaymentParameter): string => {
  return `
  <!DOCTYPE html>
  <html lang="en" style="margin: 0; padding: 0;">
  
  <head>
    <meta charset="UTF-8" />
    <title>Course Purchase Confirmation</title>
  </head>
  
  <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f9f9; margin: 0; padding: 0;">
    <table width="100%" cellspacing="0" cellpadding="0" style="padding: 40px 0;">
      <tr>
        <td align="center">
          <table width="600"
            style="background-color: #ffffff; border-radius: 10px; overflow: hidden; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <tr>
              <td align="center">
                <h1 style="color: #410445;">Thank You for Your Purchase!</h1>
                <p style="font-size: 16px; color: #333; line-height: 1.6;">
                  Hello <strong>${param.name}</strong>,<br /><br />
                  Your payment was successful, and you've been enrolled in:<br />
                  <strong style="color: #410445;">${param.courseTitle}</strong>
                </p>
  
                <table width="100%" style="margin: 20px 0; font-size: 15px; color: #555;">
                  <tr>
                    <td><strong>Transaction ID:</strong></td>
                    <td>${param.transactionId}</td>
                  </tr>
                  <tr>
                    <td><strong>Payment Date:</strong></td>
                    <td>${param.paymentDate?.toDateString()}</td>
                  </tr>
                  <tr>
                    <td><strong>Amount Paid:</strong></td>
                    <td>$${param.amountPaid}</td>
                  </tr>
                </table>
  
                <a href="${param.dashboardLink}"
                  style="display: inline-block; margin: 25px 0; padding: 12px 30px; background-color: #410445; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">Go
                  to Dashboard</a>
  
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top: 40px;">
                <p style="font-size: 13px; color: #aaaaaa;">
                  &copy; ${
                    param.year || new Date().getFullYear()
                  } <strong>Edrasa</strong>. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  
  </html>`;
};
