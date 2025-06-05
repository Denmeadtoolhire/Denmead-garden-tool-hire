
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";

export default function Home() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <main className="min-h-screen bg-[#c5d7b2] text-gray-800 p-4 md:p-10">
      <header className="mb-10">
        <h1 className="text-3xl md:text-5xl font-bold mb-2">Denmead Garden and Tool Hire Ltd</h1>
        <p className="text-lg">Hire quality garden tools in Denmead — quick, easy, and affordable.</p>
      </header>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Available Tools</h2>
        <div className="grid gap-4 max-w-3xl">
          <Card className="bg-white">
            <CardContent className="p-4">
              <h3 className="text-xl font-bold">Lawnmower</h3>
              <p className="mb-2">£15 for 4 hours</p>
              <p className="text-sm text-gray-600">Pay on collection</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4">
              <h3 className="text-xl font-bold">Strimmer</h3>
              <p className="mb-2">£12 for 4 hours</p>
              <p className="text-sm text-gray-600">Pay on collection</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4">
              <h3 className="text-xl font-bold">Hedge Trimmer</h3>
              <p className="mb-2">£14 for 4 hours</p>
              <p className="text-sm text-gray-600">Pay on collection</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Book a Tool</h2>
        <div className="bg-white p-4 rounded-xl shadow max-w-md">
          <label className="block mb-2 font-medium">Select Date:</label>
          <Calendar mode="single" selected={date} onSelect={setDate} className="mb-4" />

          <label className="block mb-2 font-medium">Name</label>
          <input type="text" className="w-full p-2 border rounded mb-4" placeholder="Your name" />

          <label className="block mb-2 font-medium">Phone</label>
          <input type="tel" className="w-full p-2 border rounded mb-4" placeholder="078..." />

          <label className="block mb-2 font-medium">Tool</label>
          <select className="w-full p-2 border rounded mb-4">
            <option>Lawnmower - £15 for 4 hours</option>
            <option>Strimmer - £12 for 4 hours</option>
            <option>Hedge Trimmer - £14 for 4 hours</option>
          </select>

          <Button className="w-full bg-green-700 hover:bg-green-800 text-white">
            Submit Booking Request
          </Button>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Business Hours</h2>
        <div className="bg-white p-4 rounded-xl shadow max-w-md">
          <ul className="list-disc list-inside text-sm">
            <li>Monday – Friday: 8:00 AM – 6:00 PM</li>
            <li>Saturday: 9:00 AM – 4:00 PM</li>
            <li>Sunday: Closed</li>
          </ul>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Find Us</h2>
        <div className="max-w-2xl mb-4">
          <iframe
            title="Google Map"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2517.634424734332!2d-1.059781484234532!3d50.903100679540834!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48745fda4a16d8db%3A0x4e9f3a89b3a43097!2s1%20Inhams%20Ln%2C%20Denmead%2C%20Waterlooville%20PO7%206LX%2C%20UK!5e0!3m2!1sen!2sus!4v1717587345000!5m2!1sen!2sus"
            width="100%"
            height="300"
            style={{ border: 0 }}
            allowFullScreen={true}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
        <a
          href="https://www.google.com/maps/dir//1+Inhams+Lane,+Denmead,+PO76LX"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded"
        >
          Get Directions
        </a>
      </section>

      <footer className="text-sm text-gray-700 mt-10">
        <p>📍 1 Inhams Lane, Denmead, PO76LX</p>
        <p>📞 07889765153</p>
        <p>📧 denmeadtoolhire@gmail.com</p>
        <p className="mt-2">You will receive confirmation by phone or email. Payment on collection only.</p>
      </footer>
    </main>
  );
}
