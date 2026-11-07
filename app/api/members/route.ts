import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseDateOnly(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export async function GET() {
  try {
    const members = await prisma.member.findMany({
      orderBy: {
        id: "desc",
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("GET MEMBERS ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to load members.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name || "").trim();
    const age = Number(body.age);
    const gender = String(body.gender || "Other").trim();
    const phone = String(body.phone || "").trim();
    const plan = String(body.plan || "").trim();
    const startDate = String(body.startDate || "");
    const expiryDate = String(body.expiryDate || "");
    const paymentStatus = String(
      body.paymentStatus || "Pending"
    );

    if (
      !name ||
      !phone ||
      !plan ||
      !startDate ||
      !expiryDate
    ) {
      return NextResponse.json(
        {
          error: "Please fill all required fields.",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(age) || age <= 0) {
      return NextResponse.json(
        {
          error: "Invalid age.",
        },
        { status: 400 }
      );
    }

    if (!["Male", "Female", "Other"].includes(gender)) {
      return NextResponse.json(
        {
          error: "Invalid gender.",
        },
        { status: 400 }
      );
    }

    const start_date = parseDateOnly(startDate);
    const expiry_date = parseDateOnly(expiryDate);

    if (!start_date || !expiry_date) {
      return NextResponse.json(
        {
          error: "Invalid start date or expiry date.",
        },
        { status: 400 }
      );
    }

    const member = await prisma.member.create({
      data: {
        name,
        age,
        gender,
        phone,
        plan,
        start_date,
        expiry_date,
        payment_status: paymentStatus,
      },
    });

    return NextResponse.json(member, {
      status: 201,
    });
  } catch (error) {
    console.error("CREATE MEMBER ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to create member.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const id = Number(body.id);

    if (!Number.isInteger(id)) {
      return NextResponse.json(
        {
          error: "Invalid member ID.",
        },
        { status: 400 }
      );
    }

    const name = String(body.name || "").trim();
    const age = Number(body.age);
    const gender = String(body.gender || "Other").trim();
    const phone = String(body.phone || "").trim();
    const plan = String(body.plan || "").trim();
    const startDate = String(body.startDate || "");
    const expiryDate = String(body.expiryDate || "");
    const paymentStatus = String(
      body.paymentStatus || "Pending"
    );

    if (
      !name ||
      !phone ||
      !plan ||
      !startDate ||
      !expiryDate
    ) {
      return NextResponse.json(
        {
          error: "Please fill all required fields.",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(age) || age <= 0) {
      return NextResponse.json(
        {
          error: "Invalid age.",
        },
        { status: 400 }
      );
    }

    if (!["Male", "Female", "Other"].includes(gender)) {
      return NextResponse.json(
        {
          error: "Invalid gender.",
        },
        { status: 400 }
      );
    }

    const start_date = parseDateOnly(startDate);
    const expiry_date = parseDateOnly(expiryDate);

    if (!start_date || !expiry_date) {
      return NextResponse.json(
        {
          error: "Invalid start date or expiry date.",
        },
        { status: 400 }
      );
    }

    const member = await prisma.member.update({
      where: {
        id,
      },
      data: {
        name,
        age,
        gender,
        phone,
        plan,
        start_date,
        expiry_date,
        payment_status: paymentStatus,
      },
    });

    return NextResponse.json(member);
  } catch (error) {
    console.error("UPDATE MEMBER ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to update member.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);

    let id = Number(url.searchParams.get("id"));

    if (!id) {
      const body = await request.json().catch(() => ({}));

      id = Number(body.id);
    }

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        {
          error: "Invalid member ID.",
        },
        { status: 400 }
      );
    }

    await prisma.member.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Member deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE MEMBER ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to delete member.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}