import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";

const plans = [
  { name: "1 Month", price: 1000, months: 1 },
  { name: "3 Months", price: 2500, months: 3 },
  { name: "6 Months", price: 4500, months: 6 },
  { name: "1 Year", price: 8000, months: 12 },
];

function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

function daysUntil(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return Math.ceil(
    (target.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

function money(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function isActive(expiryDate: Date) {
  return daysUntil(expiryDate) >= 0;
}

function getDirectAnswer(
  question: string,
  members: any[]
): string | null {
  const q = question.toLowerCase().trim();

  const totalMembers = members.length;

  const activeMembers = members.filter((member) =>
    isActive(member.expiry_date)
  ).length;

  const expiredMembers = members.filter(
    (member) => !isActive(member.expiry_date)
  ).length;

  const paidMembers = members.filter(
    (member) => member.payment_status === "Paid"
  );

  const pendingMembers = members.filter(
    (member) => member.payment_status === "Pending"
  );

  const revenue = paidMembers.reduce((total, member) => {
    const plan = plans.find(
      (p) =>
        p.name.toLowerCase() ===
        String(member.plan).toLowerCase()
    );

    return total + (plan?.price || 0);
  }, 0);

  const averageAge =
    totalMembers > 0
      ? members.reduce(
          (sum, member) => sum + Number(member.age),
          0
        ) / totalMembers
      : 0;

  const expiringSoon = members.filter((member) => {
    const days = daysUntil(member.expiry_date);

    return days >= 0 && days <= 30;
  });

  // TOTAL MEMBERS
  if (
    q.includes("how many members") ||
    q.includes("total members") ||
    q.includes("number of members") ||
    q.includes("members do i have") ||
    q === "members"
  ) {
    return `You currently have ${totalMembers} members.`;
  }

  // ACTIVE MEMBERS
  if (
    q.includes("active members") ||
    q.includes("how many active") ||
    q.includes("currently active")
  ) {
    return `You currently have ${activeMembers} active members.`;
  }

  // EXPIRED MEMBERS
  if (
    q.includes("expired members") ||
    q.includes("how many expired") ||
    q.includes("expired membership")
  ) {
    return `You have ${expiredMembers} expired members.`;
  }

  // PENDING PAYMENTS
  if (
    q.includes("pending payment") ||
    q.includes("pending payments") ||
    q.includes("unpaid") ||
    q.includes("who has not paid")
  ) {
    if (pendingMembers.length === 0) {
      return "Great! There are no pending payments.";
    }

    const names = pendingMembers
      .slice(0, 10)
      .map((member) => member.name)
      .join(", ");

    return `You have ${pendingMembers.length} pending payment${
      pendingMembers.length === 1 ? "" : "s"
    }.\n\n${names}${
      pendingMembers.length > 10 ? " and more..." : ""
    }`;
  }

  // PAID MEMBERS
  if (
    q.includes("paid members") ||
    q.includes("who has paid") ||
    q.includes("members who paid")
  ) {
    if (paidMembers.length === 0) {
      return "There are currently no members with a Paid payment status.";
    }

    const names = paidMembers
      .slice(0, 10)
      .map((member) => member.name)
      .join(", ");

    return `You have ${paidMembers.length} paid member${
      paidMembers.length === 1 ? "" : "s"
    }.\n\n${names}${
      paidMembers.length > 10 ? " and more..." : ""
    }`;
  }

  // REVENUE
  if (
    q.includes("revenue") ||
    q.includes("income") ||
    q.includes("money collected") ||
    q.includes("how much money")
  ) {
    return `Your collected revenue is ${money(revenue)}.`;
  }

  // AVERAGE AGE
  if (
    q.includes("average age") ||
    q.includes("avg age")
  ) {
    return `The average age of your members is ${averageAge.toFixed(
      1
    )} years.`;
  }

  // EXPIRING SOON
  if (
    q.includes("expiring") ||
    q.includes("expire soon") ||
    q.includes("expiry soon") ||
    q.includes("next 30 days")
  ) {
    if (expiringSoon.length === 0) {
      return "No memberships are expiring within the next 30 days.";
    }

    const list = expiringSoon
      .slice(0, 10)
      .map((member) => {
        const days = daysUntil(member.expiry_date);

        return `${member.name} — ${
          days === 0
            ? "expires today"
            : `expires in ${days} day${
                days === 1 ? "" : "s"
              }`
        }`;
      })
      .join("\n");

    return `You have ${expiringSoon.length} membership${
      expiringSoon.length === 1 ? "" : "s"
    } expiring within the next 30 days:\n\n${list}${
      expiringSoon.length > 10
        ? "\nAnd more..."
        : ""
    }`;
  }

  // PLANS
  if (
    q.includes("plans") ||
    q.includes("membership plans") ||
    q.includes("available plans")
  ) {
    return `Your available membership plans are:\n\n${plans
      .map(
        (plan) =>
          `• ${plan.name} — ${money(plan.price)}`
      )
      .join("\n")}`;
  }

  // POPULAR PLAN
  if (
    q.includes("popular plan") ||
    q.includes("most popular plan") ||
    q.includes("most members")
  ) {
    const planCounts: Record<string, number> = {};

    members.forEach((member) => {
      const plan = String(member.plan);

      planCounts[plan] =
        (planCounts[plan] || 0) + 1;
    });

    const sortedPlans = Object.entries(
      planCounts
    ).sort((a, b) => b[1] - a[1]);

    if (sortedPlans.length === 0) {
      return "There is no membership plan data yet.";
    }

    const [popularPlan, count] = sortedPlans[0];

    return `${popularPlan} is currently the most popular plan with ${count} member${
      count === 1 ? "" : "s"
    }.`;
  }

  // LIST MEMBERS
  if (
    q === "list members" ||
    q === "show members" ||
    q === "show all members" ||
    q.includes("list all members")
  ) {
    if (members.length === 0) {
      return "There are currently no members.";
    }

    return members
      .slice(0, 20)
      .map(
        (member) =>
          `• ${member.name} — ${member.phone} — ${member.plan} — ${member.payment_status}`
      )
      .join("\n");
  }

  // GYM SUMMARY
  if (
    q.includes("gym summary") ||
    q.includes("summary of my gym") ||
    q.includes("give me a summary")
  ) {
    return `Here is your gym summary:

• Total members: ${totalMembers}
• Active members: ${activeMembers}
• Expired members: ${expiredMembers}
• Paid members: ${paidMembers.length}
• Pending payments: ${pendingMembers.length}
• Collected revenue: ${money(revenue)}
• Average member age: ${averageAge.toFixed(1)} years
• Expiring within 30 days: ${expiringSoon.length}`;
  }

  return null;
}

async function askGemini(
  client: GoogleGenAI,
  prompt: string
) {
  const MODEL_NAME = "gemini-3.6-flash";

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      console.log(
        `Gemini attempt ${attempt + 1}/3...`
      );

      const response =
        await client.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
        });

      const answer = response.text?.trim();

      if (answer) {
        return answer;
      }

      throw new Error(
        "Gemini returned an empty response."
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : String(error);

      console.warn(
        `Gemini attempt ${attempt + 1} failed:`,
        errorMessage
      );

      const isUnavailable =
        errorMessage.includes("503") ||
        errorMessage.includes("UNAVAILABLE");

      if (isUnavailable && attempt < 2) {
        console.log(
          "Gemini unavailable. Retrying in 3 seconds..."
        );

        await new Promise((resolve) =>
          setTimeout(resolve, 3000)
        );

        continue;
      }

      throw error;
    }
  }

  throw new Error("Gemini request failed.");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const question = String(
      body.question || ""
    ).trim();

    if (!question) {
      return NextResponse.json(
        {
          error: "Please enter a question.",
        },
        { status: 400 }
      );
    }

    // Get all gym members
    const members = await prisma.member.findMany({
      orderBy: {
        id: "desc",
      },
    });

    // Answer simple database questions directly.
    // This makes these questions extremely fast.
    const directAnswer = getDirectAnswer(
      question,
      members
    );

    if (directAnswer) {
      return NextResponse.json({
        answer: directAnswer,
      });
    }

    const today = formatDate(new Date());

    const gymData = members.map((member) => ({
      id: member.id,
      name: member.name,
      age: member.age,
      phone: member.phone,
      plan: member.plan,
      startDate: formatDate(member.start_date),
      expiryDate: formatDate(member.expiry_date),
      paymentStatus: member.payment_status,
      membershipStatus: isActive(
        member.expiry_date
      )
        ? "Active"
        : "Expired",
      daysUntilExpiry: daysUntil(
        member.expiry_date
      ),
    }));

    const prompt = `
You are GYMAI 🤖, a smart and friendly gym management assistant.

Today: ${today}

GYM DATABASE:
${JSON.stringify(gymData)}

AVAILABLE MEMBERSHIP PLANS:
${JSON.stringify(plans)}

USER QUESTION:
${question}

IMPORTANT RULES:

1. If the user asks about their actual gym, members, payments, memberships, revenue, expiry dates, plans, or other database information:
   - Use the provided gym database.
   - Never invent member information.
   - Only state facts that can be supported by the database.

2. If the user asks for general advice, ideas, suggestions, strategies, fitness business tips, marketing ideas, retention ideas, gym improvement ideas, or other general questions:
   - You MAY use your general knowledge.
   - Give practical and useful suggestions.
   - Do not say that the database does not contain the answer.
   - You do not need database information to answer general questions.

3. If the question contains both database information and general advice:
   - Use the database for the factual part.
   - Use your general knowledge for the advice part.

4. Keep answers concise and useful.

5. Use ₹ when discussing Indian prices or money.

6. Use bullet points when it makes the answer easier to read.

7. Never make up specific facts about this gym that are not present in the database.

8. Be friendly, professional, and helpful.

Answer the user's question now.
`;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    const client = new GoogleGenAI({
      apiKey,
    });

    try {
      const answer = await askGemini(
        client,
        prompt
      );

      return NextResponse.json({
        answer,
      });
    } catch (error) {
      console.error(
        "GEMINI FINAL ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            "GYMAI is temporarily busy. Please try again in a moment.",
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error(
      "AI ROUTE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process your question.",
      },
      { status: 500 }
    );
  }
}