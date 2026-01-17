export const messages = {
    welcome: (userName) => `
Hello, *${userName}*! 👋

Thank you for contacting *Rica Casa*. We’ve received your message and will get back to you as soon as possible.

Please feel free to share any details or questions about how we can assist you. In *our catalogue*, you\'ll find houses available for rent. 🏠
    `.trim(),

    mainMenu: `
*How can we help you today?*

*1-* Instant booking
_I want to book now_

*2-* Early check-in / Late check-out
_Check availability_

*3-* Special occasion
_Let us know if you're celebrating something special_

*4-* Parking information
_Parking details and availability_

*5-* Change my reservation
_I need to modify my booking_

*6-* I have a question
_I have another enquiry_

To reply, simply send *the number* corresponding to your chosen option.
    `.trim(),

    invalidOption: '❌ Invalid option. Please send only the *number* of the option you want.',

    error: '⚠️ An error occurred. Let\'s go back to the main menu.',

    anythingElse: 'If you would like to discuss another matter, please type your message and we will respond as soon as possible.',

    infoNotFound: 'ℹ️ Information not available at the moment.',

    featureNotAvailable: '🚧 This feature is still under development.',

    // Option 1: Instant Booking
    instantBooking: `
📅 *Instant Booking*

Your reservation is confirmed automatically.

You will receive all the important information 24h before your check in, including:
• Reservation confirmation
• Check-in and check-out times
• Codes, address and all information needed for check in

Everything is sent automatically to make your experience smooth and easy. ✨
    `.trim(),

    // Option 2: Early Check-in / Late Check-out
    earlyLateCheckout: `
⏰ *Early Check-in or Late Check-out*

The availability of early check-in or late check-out depends on whether we have another guest on the same day.

*Early check-in:*
You're welcome to drop your luggage from 1:00 PM.

*Late check-out:*
This is subject to availability, depending on the next check-in.

📌 Please make sure to check with us *24 hours before* check-in or check-out so we can confirm availability.
    `.trim(),

    // Option 3: Special Occasion
    specialOccasion: `
🎉 *Special Occasion*

Are you celebrating a special occasion?

Let us know the occasion and any special requests.
We will do our best to make your stay even more memorable. ✨

Please type your message below:
    `.trim(),

    // Option 4: Parking Information
    parkingInfo: `
🚗 *Parking Information*

Most of our properties are central and for this reason do not have parking available.

For accurate information, please tell us the name of the property you will be staying at.
We will be happy to assist you.

💡 *Tip:* There is free street parking after 8pm and pay & display during the day in some roads. However, there is an app that you can download called *'Just Park'* - it will tell you the available spaces to rent by the hour or day in your area. Check it out! 😉
    `.trim(),

    // Option 5: Change Reservation
    changeReservation: `
✏️ *I Need to Change My Reservation*

To assist you, we need to understand:
• The reason for the change
• What you would like to modify in your reservation
• Your full name and reservation dates

⚠️ *Important:*
Any changes must be requested at least *7 days in advance*.
Unfortunately, we are unable to make changes within 7 days of check-in.

Please type your request below:
    `.trim(),

    // Option 6: General Question
    generalQuestion: `
❓ *I Have a Question*

Please write your question below.
How can we help you?
    `.trim(),

    // Awaiting guest input
    requestPropertyName: '🏠 Please tell us the *name of the property* you will be staying at:',

    requestDetails: '📝 Please provide the details of your request:',

    messageReceived: '✅ Thank you! Your message has been received. Our team will get back to you shortly.',

    transferToHuman: `
👤 *Connecting you to our team*

Please wait a moment, one of our team members will respond to you shortly.

⏰ *Response time:*
We typically respond within a few hours during business hours.
    `.trim(),

    waitingForHuman: '⏳ You are in the queue. Please wait...',

    goodbye: (userName) => `
👋 Thank you for contacting us, *${userName}*!

We hope you have a wonderful stay.
See you soon!

_Type "menu" at any time to start a new conversation._
    `.trim(),

    backToMenu: '_Type *0* to go back to the main menu._'
};
