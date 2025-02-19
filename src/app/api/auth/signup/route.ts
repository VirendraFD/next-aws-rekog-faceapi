import { connectDB } from "@/app/lib/mongodb";
import User from "@/app/models/User";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {

    await connectDB();

    const {business_unique_id, username, email, password } = await req.json();
    
     console.log(business_unique_id, username, email, password);

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({ business_unique_id, username, email, password: hashedPassword });
    await newUser.save();

    return NextResponse.json({ message: "User registered successfully" }, { status: 201 });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
