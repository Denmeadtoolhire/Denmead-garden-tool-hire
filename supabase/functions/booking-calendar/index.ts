import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { format, parseISO } from 'https://esm.sh/date-fns@3.3.1'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const bookingId = url.pathname.split('/').pop()

  if (!bookingId) {
    return new Response('Booking ID required', { status: 400 })
  }

  try {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*, tools(name)')
      .eq('id', bookingId)
      .single()

    if (error || !booking) {
      return new Response('Booking not found', { status: 404 })
    }

    const startDate = parseISO(booking.start_time)
    const endDate = parseISO(booking.end_time)

    const icsContent = generateICS({
      title: `Tool Hire: ${booking.tools.name}`,
      description: `Booking reference: ${booking.id.substring(0, 8).toUpperCase()}\nPickup: 1 Inhams Lane, Denmead, PO7 6LX\nPhone: 07889765153`,
      location: '1 Inhams Lane, Denmead, PO7 6LX',
      startDate,
      endDate,
      organizer: 'denmeadtoolhire@gmail.com',
    })

    return new Response(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="booking-${booking.id.substring(0, 8)}.ics"`,
      },
    })
  } catch (err) {
    return new Response('Error generating calendar file', { status: 500 })
  }
})

function generateICS({
  title,
  description,
  location,
  startDate,
  endDate,
  organizer,
}: {
  title: string
  description: string
  location: string
  startDate: Date
  endDate: Date
  organizer: string
}): string {
  const formatDate = (d: Date) => {
    const year = d.getUTCFullYear()
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    const hours = String(d.getUTCHours()).padStart(2, '0')
    const minutes = String(d.getUTCMinutes()).padStart(2, '0')
    const seconds = String(d.getUTCSeconds()).padStart(2, '0')
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
  }

  const uid = `${Date.now()}@denmeadtoolhire.local`
  const now = formatDate(new Date())

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Denmead Tool Hire//Calendar//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${escapeText(title)}
DESCRIPTION:${escapeText(description)}
LOCATION:${escapeText(location)}
ORGANIZER;CN=Denmead Tool Hire:mailto:${organizer}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n')
}
