export const menuOptions = {
    main: [
        {
            id: 'instant_booking',
            title: 'Instant booking',
            subtitle: 'I want to book now',
            emoji: '📅',
            action: 'SHOW_INFO',
            response: 'instantBooking'
        },
        {
            id: 'early_late_checkout',
            title: 'Early check-in / Late check-out',
            subtitle: 'Check availability',
            emoji: '⏰',
            action: 'SHOW_INFO',
            response: 'earlyLateCheckout'
        },
        {
            id: 'special_occasion',
            title: 'Special occasion',
            subtitle: 'Let us know if you\'re celebrating something special',
            emoji: '🎉',
            action: 'REQUEST_INPUT',
            response: 'specialOccasion',
            inputType: 'special_request'
        },
        {
            id: 'parking',
            title: 'Parking information',
            subtitle: 'Parking details and availability',
            emoji: '🚗',
            action: 'SHOW_INFO',
            response: 'parkingInfo'
        },
        {
            id: 'change_reservation',
            title: 'Change my reservation',
            subtitle: 'I need to modify my booking',
            emoji: '✏️',
            action: 'REQUEST_INPUT',
            response: 'changeReservation',
            inputType: 'reservation_change'
        },
        {
            id: 'question',
            title: 'I have a question',
            subtitle: 'I have another enquiry',
            emoji: '❓',
            action: 'REQUEST_INPUT',
            response: 'generalQuestion',
            inputType: 'general_question'
        }
    ]
};
