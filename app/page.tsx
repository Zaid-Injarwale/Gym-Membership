"use client";

import { useEffect, useMemo, useState } from "react";

const plans = [
  { name: "1 Month", price: 1000, months: 1, duration: "1 month" },
  { name: "3 Months", price: 2500, months: 3, duration: "3 months" },
  { name: "6 Months", price: 4500, months: 6, duration: "6 months" },
  { name: "1 Year", price: 8000, months: 12, duration: "12 months" },
];

type Gender = "Male" | "Female" | "Other";

type Member = {
  id: number;
  name: string;
  age: number;
  gender: Gender;
  phone: string;
  plan: string;
  startDate: string;
  expiryDate: string;
  expiry: string;
  status: "Paid" | "Pending";
};

type ApiMember = {
  id: number;
  name: string;
  age: number;
  gender?: Gender;
  phone: string;
  plan: string;
  start_date: string;
  expiry_date: string;
  payment_status: "Paid" | "Pending";
};

type AiMessage = {
  role: "user" | "assistant";
  content: string;
};

/* -------------------------------------------------------
   DATE HELPERS
------------------------------------------------------- */

function calculateExpiry(startDate: string, months: number) {
  const isoDate = calculateExpiryISO(startDate, months);

  if (!isoDate) {
    return "";
  }

  return formatDate(isoDate);
}

function calculateExpiryISO(startDate: string, months: number) {
  if (!startDate) {
    return "";
  }

  const parts = startDate.split("-").map(Number);

  if (parts.length !== 3) {
    return "";
  }

  const [year, month, day] = parts;

  if (!year || !month || !day) {
    return "";
  }

  const targetMonthIndex = month - 1 + months;

  const targetYear =
    year + Math.floor(targetMonthIndex / 12);

  const targetMonth = targetMonthIndex % 12;

  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0)
  ).getUTCDate();

  const targetDay = Math.min(day, lastDayOfTargetMonth);

  return `${targetYear}-${String(targetMonth + 1).padStart(
    2,
    "0"
  )}-${String(targetDay).padStart(2, "0")}`;
}

function formatDate(dateString: string) {
  if (!dateString) {
    return "-";
  }

  const date = new Date(
    `${dateString.slice(0, 10)}T00:00:00Z`
  );

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatInputDate(dateString: string) {
  if (!dateString) {
    return "";
  }

  return dateString.slice(0, 10);
}

/* -------------------------------------------------------
   EXPIRY DIFFERENCE
------------------------------------------------------- */

function getDaysUntilExpiry(expiryDate: string) {
  if (!expiryDate) {
    return null;
  }

  const today = new Date();

  const todayUTC = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const parts = expiryDate.slice(0, 10).split("-").map(Number);

  if (parts.length !== 3) {
    return null;
  }

  const [year, month, day] = parts;

  if (!year || !month || !day) {
    return null;
  }

  const expiryUTC = Date.UTC(
    year,
    month - 1,
    day
  );

  return Math.ceil(
    (expiryUTC - todayUTC) /
      (1000 * 60 * 60 * 24)
  );
}

/* -------------------------------------------------------
   API HELPERS
------------------------------------------------------- */

async function readResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: text,
    };
  }
}

function convertApiMember(member: ApiMember): Member {
  const startDate = formatInputDate(
    member.start_date
  );

  const expiryDate = formatInputDate(
    member.expiry_date
  );

  return {
    id: member.id,
    name: member.name,
    age: member.age,
    gender: member.gender || "Other",
    phone: member.phone,
    plan: member.plan,
    startDate,
    expiryDate,
    expiry: formatDate(expiryDate),
    status:
      member.payment_status === "Paid"
        ? "Paid"
        : "Pending",
  };
}

/* -------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------- */

export default function Home() {
  const [activePage, setActivePage] =
    useState("Dashboard");

  const [showAddMember, setShowAddMember] =
    useState(false);

  const [showEditMember, setShowEditMember] =
    useState(false);

  const [showDeleteMember, setShowDeleteMember] =
    useState(false);

  const [memberToDelete, setMemberToDelete] =
    useState<Member | null>(null);

  const [members, setMembers] =
    useState<Member[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [searchTerm, setSearchTerm] =
    useState("");

  /* -------------------------------------------------------
     AI ASSISTANT
  ------------------------------------------------------- */

  const [aiMessages, setAiMessages] =
    useState<AiMessage[]>([
      {
        role: "assistant",
        content:
          "Hi! I'm GYMAI 🤖 Ask me anything about your gym members, payments, memberships, revenue, or upcoming expiries.",
      },
    ]);

  const [aiInput, setAiInput] =
    useState("");

  const [aiLoading, setAiLoading] =
    useState(false);

  /* -------------------------------------------------------
     ADD FORM
  ------------------------------------------------------- */

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] =
    useState<Gender>("Other");
  const [phone, setPhone] = useState("");

  const [selectedPlan, setSelectedPlan] =
    useState("1 Month");

  const [startDate, setStartDate] =
    useState("");

  const [paymentStatus, setPaymentStatus] =
    useState<"Paid" | "Pending">("Paid");

  /* -------------------------------------------------------
     EDIT FORM
  ------------------------------------------------------- */

  const [editingMemberId, setEditingMemberId] =
    useState<number | null>(null);

  const [editName, setEditName] =
    useState("");

  const [editAge, setEditAge] =
    useState("");

  const [editGender, setEditGender] =
    useState<Gender>("Other");

  const [editPhone, setEditPhone] =
    useState("");

  const [editPlan, setEditPlan] =
    useState("1 Month");

  const [editStartDate, setEditStartDate] =
    useState("");

  const [editPaymentStatus, setEditPaymentStatus] =
    useState<"Paid" | "Pending">("Paid");

  /* -------------------------------------------------------
     LOAD MEMBERS
  ------------------------------------------------------- */

  async function loadMembers() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/members",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error
            ? `${data.error}${
                data.details
                  ? ` ${data.details}`
                  : ""
              }`
            : `Failed to load members (${response.status}).`
        );
      }

      if (!Array.isArray(data)) {
        throw new Error(
          "Invalid response received from server."
        );
      }

      setMembers(
        data.map(
          (member: ApiMember) =>
            convertApiMember(member)
        )
      );
    } catch (error) {
      console.error(
        "LOAD MEMBERS ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to load members from database."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMembers();
  }, []);

  /* -------------------------------------------------------
     AI ASK
  ------------------------------------------------------- */

  async function askAI(customQuestion?: string) {
    const question = (customQuestion ?? aiInput)
      .trim()
      .replace(/\s+/g, " ");

    if (!question || aiLoading) {
      return;
    }

    setAiInput("");

    setAiMessages((current) => [
      ...current,
      {
        role: "user",
        content: question,
      },
    ]);

    try {
      setAiLoading(true);

      const response = await fetch(
        "/api/ai",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question,
          }),
        }
      );

      const data =
        await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to get an answer from GYMAI."
        );
      }

      if (!data.answer) {
        throw new Error(
          "GYMAI returned an empty response."
        );
      }

      setAiMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer,
        },
      ]);
    } catch (error) {
      console.error(
        "AI REQUEST ERROR:",
        error
      );

      setAiMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? `Sorry, I couldn't process that. ${error.message}`
              : "Sorry, I couldn't process that request.",
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  }

  function handleAiKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      askAI();
    }
  }

  /* -------------------------------------------------------
     ADD MEMBER
  ------------------------------------------------------- */

  async function addMember() {
    if (
      !name.trim() ||
      !age ||
      !phone.trim() ||
      !startDate
    ) {
      alert("Please fill all fields.");
      return;
    }

    const numericAge = Number(age);

    if (
      !Number.isInteger(numericAge) ||
      numericAge <= 0
    ) {
      alert("Please enter a valid age.");
      return;
    }

    const plan = plans.find(
      (p) => p.name === selectedPlan
    );

    if (!plan) {
      alert("Please select a valid plan.");
      return;
    }

    const expiryDate = calculateExpiryISO(
      startDate,
      plan.months
    );

    if (!expiryDate) {
      alert("Invalid start date.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        "/api/members",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            age: numericAge,
            gender,
            phone: phone.trim(),
            plan: plan.name,
            startDate,
            expiryDate,
            paymentStatus,
          }),
        }
      );

      const data =
        await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error
            ? `${data.error}${
                data.details
                  ? ` ${data.details}`
                  : ""
              }`
            : "Failed to add member."
        );
      }

      if (!data.id) {
        throw new Error(
          "Server did not return the created member."
        );
      }

      setMembers((current) => [
        convertApiMember(data),
        ...current,
      ]);

      resetAddForm();

      setShowAddMember(false);

      setActivePage("Members");

      alert(
        "Member added successfully! ✅"
      );
    } catch (error) {
      console.error(
        "ADD MEMBER ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to add member."
      );
    } finally {
      setSaving(false);
    }
  }

  function resetAddForm() {
    setName("");
    setAge("");
    setGender("Other");
    setPhone("");
    setSelectedPlan("1 Month");
    setStartDate("");
    setPaymentStatus("Paid");
  }

  /* -------------------------------------------------------
     OPEN EDIT
  ------------------------------------------------------- */

  function openEditMember(member: Member) {
    setEditingMemberId(member.id);

    setEditName(member.name);

    setEditAge(
      member.age.toString()
    );

    setEditGender(member.gender);

    setEditPhone(member.phone);

    setEditPlan(member.plan);

    setEditStartDate(
      formatInputDate(member.startDate)
    );

    setEditPaymentStatus(
      member.status
    );

    setShowEditMember(true);
  }

  /* -------------------------------------------------------
     SAVE EDIT
  ------------------------------------------------------- */

  async function saveEditedMember() {
    if (
      editingMemberId === null ||
      !editName.trim() ||
      !editAge ||
      !editPhone.trim() ||
      !editStartDate
    ) {
      alert("Please fill all fields.");
      return;
    }

    const numericAge =
      Number(editAge);

    if (
      !Number.isInteger(numericAge) ||
      numericAge <= 0
    ) {
      alert("Please enter a valid age.");
      return;
    }

    const plan = plans.find(
      (p) => p.name === editPlan
    );

    if (!plan) {
      alert("Please select a valid plan.");
      return;
    }

    const expiryDate =
      calculateExpiryISO(
        editStartDate,
        plan.months
      );

    if (!expiryDate) {
      alert("Invalid start date.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        "/api/members",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: editingMemberId,
            name: editName.trim(),
            age: numericAge,
            gender: editGender,
            phone: editPhone.trim(),
            plan: plan.name,
            startDate: editStartDate,
            expiryDate,
            paymentStatus:
              editPaymentStatus,
          }),
        }
      );

      const data =
        await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error
            ? `${data.error}${
                data.details
                  ? ` ${data.details}`
                  : ""
              }`
            : "Failed to update member."
        );
      }

      if (!data.id) {
        throw new Error(
          "Server did not return the updated member."
        );
      }

      const updatedMember =
        convertApiMember(data);

      setMembers((current) =>
        current.map((member) =>
          member.id === editingMemberId
            ? updatedMember
            : member
        )
      );

      closeEditModal();

      alert(
        "Member updated successfully! ✅"
      );
    } catch (error) {
      console.error(
        "UPDATE MEMBER ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to update member."
      );
    } finally {
      setSaving(false);
    }
  }

  function closeEditModal() {
    setShowEditMember(false);

    setEditingMemberId(null);

    setEditName("");

    setEditAge("");

    setEditGender("Other");

    setEditPhone("");

    setEditPlan("1 Month");

    setEditStartDate("");

    setEditPaymentStatus("Paid");
  }

  /* -------------------------------------------------------
     DELETE
  ------------------------------------------------------- */

  function openDeleteMember(member: Member) {
    setMemberToDelete(member);

    setShowDeleteMember(true);
  }

  function closeDeleteModal() {
    setShowDeleteMember(false);

    setMemberToDelete(null);
  }

  async function confirmDeleteMember() {
    if (!memberToDelete) {
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        "/api/members",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: memberToDelete.id,
          }),
        }
      );

      const data =
        await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error
            ? `${data.error}${
                data.details
                  ? ` ${data.details}`
                  : ""
              }`
            : "Failed to delete member."
        );
      }

      setMembers((current) =>
        current.filter(
          (member) =>
            member.id !==
            memberToDelete.id
        )
      );

      closeDeleteModal();

      alert(
        "Member deleted successfully! 🗑️"
      );
    } catch (error) {
      console.error(
        "DELETE MEMBER ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete member."
      );
    } finally {
      setSaving(false);
    }
  }

  /* -------------------------------------------------------
     SEARCH
  ------------------------------------------------------- */

  const filteredMembers =
    members.filter((member) => {
      const search =
        searchTerm
          .toLowerCase()
          .trim();

      if (!search) {
        return true;
      }

      return (
        member.name
          .toLowerCase()
          .includes(search) ||
        member.phone
          .toLowerCase()
          .includes(search) ||
        member.plan
          .toLowerCase()
          .includes(search) ||
        member.gender
          .toLowerCase()
          .includes(search)
      );
    });

  /* -------------------------------------------------------
     DASHBOARD STATS
  ------------------------------------------------------- */

  const activeMemberships =
    useMemo(() => {
      return members.filter((member) => {
        const days =
          getDaysUntilExpiry(
            member.expiryDate
          );

        return (
          days !== null &&
          days >= 0
        );
      }).length;
    }, [members]);

  const totalRevenue =
    useMemo(() => {
      return members
        .filter(
          (member) =>
            member.status ===
            "Paid"
        )
        .reduce(
          (total, member) => {
            const plan =
              plans.find(
                (p) =>
                  p.name ===
                  member.plan
              );

            return (
              total +
              (plan?.price || 0)
            );
          },
          0
        );
    }, [members]);

  const pendingPayments =
    useMemo(() => {
      return members.filter(
        (member) =>
          member.status ===
          "Pending"
      ).length;
    }, [members]);

  const expiringMembers =
    useMemo(() => {
      return members
        .map((member) => {
          const days =
            getDaysUntilExpiry(
              member.expiryDate
            );

          if (days === null) {
            return null;
          }

          return {
            member,
            days,
          };
        })
        .filter(
          (
            item
          ): item is {
            member: Member;
            days: number;
          } =>
            item !== null &&
            item.days >= 0 &&
            item.days <= 30
        )
        .sort(
          (a, b) =>
            a.days - b.days
        )
        .slice(0, 5);
    }, [members]);

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="flex min-h-screen">

        {/* SIDEBAR */}
        <aside className="hidden w-64 border-r border-zinc-800 bg-zinc-950 p-5 md:block">

          <div className="mb-10">
            <h1 className="text-2xl font-black tracking-tight">
              GYM
              <span className="text-red-500">
                AI
              </span>
            </h1>

            <p className="mt-1 text-xs text-zinc-500">
              Membership Management
            </p>
          </div>

          <nav className="space-y-2">
            {[
              "Dashboard",
              "Members",
              "Plans",
              "AI Assistant",
            ].map((item) => (
              <button
                key={item}
                onClick={() =>
                  setActivePage(item)
                }
                className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                  activePage === item
                    ? "bg-red-600 text-white"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                {item ===
                  "Dashboard" && "▦"}

                {item ===
                  "Members" && "👥"}

                {item ===
                  "Plans" && "💳"}

                {item ===
                  "AI Assistant" && "✦"}

                <span className="ml-3">
                  {item}
                </span>
              </button>
            ))}
          </nav>

          <div className="mt-10 rounded-2xl border border-red-900/40 bg-red-950/20 p-4">
            <p className="text-sm font-semibold">
              AI Assistant
            </p>

            <p className="mt-2 text-xs leading-5 text-zinc-400">
              Ask questions about
              members, payments and
              memberships.
            </p>

            <button
              onClick={() =>
                setActivePage(
                  "AI Assistant"
                )
              }
              className="mt-4 w-full rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold hover:bg-red-500"
            >
              Open AI
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <section className="flex-1">

          {/* HEADER */}
          <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-5 md:px-10">

            <div>
              <p className="text-sm text-zinc-500">
                Gym Management
              </p>

              <h2 className="text-2xl font-bold">
                {activePage}
              </h2>
            </div>

            <button
              onClick={() =>
                setShowAddMember(true)
              }
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold hover:bg-red-500"
            >
              + Add Member
            </button>
          </header>

          <div className="p-6 md:p-10">

            {/* LOADING */}
            {loading && (
              <div className="mb-6 rounded-xl border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-300">
                Loading members from
                PostgreSQL...
              </div>
            )}

            {/* DASHBOARD */}
            {activePage ===
              "Dashboard" && (
              <>
                <div className="mb-8">

                  <p className="text-3xl font-black">
                    Welcome back, Admin 👋
                  </p>

                  <p className="mt-2 text-zinc-500">
                    Here's what's
                    happening with your
                    gym today.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                  <StatCard
                    title="Total Members"
                    value={members.length.toString()}
                    description="Registered members"
                    icon="👥"
                  />

                  <StatCard
                    title="Active Memberships"
                    value={activeMemberships.toString()}
                    description="Currently active"
                    icon="✓"
                  />

                  <StatCard
                    title="Total Revenue"
                    value={`₹${totalRevenue.toLocaleString(
                      "en-IN"
                    )}`}
                    description="Paid memberships"
                    icon="₹"
                  />

                  <StatCard
                    title="Pending Payments"
                    value={pendingPayments.toString()}
                    description="Needs attention"
                    icon="!"
                  />
                </div>

                <div className="mt-8 grid gap-6 xl:grid-cols-3">

                  {/* RECENT MEMBERS */}
                  <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 xl:col-span-2">

                    <div className="flex items-center justify-between border-b border-zinc-800 p-5">

                      <div>
                        <h3 className="font-bold">
                          Recent Members
                        </h3>

                        <p className="mt-1 text-xs text-zinc-500">
                          Latest gym
                          registrations
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          setActivePage(
                            "Members"
                          )
                        }
                        className="text-sm font-medium text-red-500 hover:text-red-400"
                      >
                        View all →
                      </button>
                    </div>

                    <div className="overflow-x-auto">

                      <table className="w-full text-left text-sm">

                        <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-500">

                          <tr>
                            <th className="px-5 py-4">
                              Member
                            </th>

                            <th className="px-5 py-4">
                              Plan
                            </th>

                            <th className="px-5 py-4">
                              Expiry
                            </th>

                            <th className="px-5 py-4">
                              Payment
                            </th>
                          </tr>

                        </thead>

                        <tbody>

                          {members
                            .slice(0, 5)
                            .map(
                              (member) => (
                                <tr
                                  key={
                                    member.id
                                  }
                                  className="border-b border-zinc-800/70 last:border-0"
                                >
                                  <td className="px-5 py-4 font-medium">
                                    {
                                      member.name
                                    }
                                  </td>

                                  <td className="px-5 py-4 text-zinc-400">
                                    {
                                      member.plan
                                    }
                                  </td>

                                  <td className="px-5 py-4 text-zinc-400">
                                    {
                                      member.expiry
                                    }
                                  </td>

                                  <td className="px-5 py-4">

                                    <span
                                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                        member.status ===
                                        "Paid"
                                          ? "bg-green-500/10 text-green-400"
                                          : "bg-yellow-500/10 text-yellow-400"
                                      }`}
                                    >
                                      {
                                        member.status
                                      }
                                    </span>

                                  </td>
                                </tr>
                              )
                            )}

                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* EXPIRING */}
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40">

                    <div className="border-b border-zinc-800 p-5">

                      <h3 className="font-bold">
                        Expiring Soon
                      </h3>

                      <p className="mt-1 text-xs text-zinc-500">
                        Memberships needing
                        attention
                      </p>
                    </div>

                    <div className="space-y-3 p-5">

                      {expiringMembers.length >
                      0 ? (
                        expiringMembers.map(
                          ({
                            member,
                            days,
                          }) => (
                            <ExpiryMember
                              key={
                                member.id
                              }
                              name={
                                member.name
                              }
                              days={
                                days ===
                                0
                                  ? "Expires today"
                                  : `${days} days left`
                              }
                            />
                          )
                        )
                      ) : (
                        <p className="py-5 text-center text-sm text-zinc-500">
                          No memberships
                          expiring soon.
                        </p>
                      )}

                    </div>
                  </div>
                </div>

                {/* PLANS */}
                <div className="mt-8">

                  <div className="mb-5">

                    <h3 className="text-xl font-bold">
                      Membership Plans
                    </h3>

                    <p className="mt-1 text-sm text-zinc-500">
                      Your current gym
                      membership pricing
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                    {plans.map(
                      (plan) => (
                        <div
                          key={
                            plan.name
                          }
                          className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 transition hover:border-red-600/60"
                        >

                          <p className="text-sm text-zinc-500">
                            {
                              plan.duration
                            }
                          </p>

                          <h4 className="mt-2 text-lg font-bold">
                            {
                              plan.name
                            }
                          </h4>

                          <p className="mt-4 text-3xl font-black">
                            ₹
                            {plan.price.toLocaleString(
                              "en-IN"
                            )}
                          </p>

                        </div>
                      )
                    )}

                  </div>
                </div>
              </>
            )}

            {/* MEMBERS */}
            {activePage ===
              "Members" && (
              <div>

                <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                  <div>

                    <h2 className="text-2xl font-bold">
                      All Members
                    </h2>

                    <p className="mt-1 text-zinc-500">
                      Search and manage
                      your gym members.
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      setShowAddMember(true)
                    }
                    className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold hover:bg-red-500"
                  >
                    + Add Member
                  </button>

                </div>

                {/* SEARCH */}
                <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">

                  <div className="relative">

                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                      🔍
                    </span>

                    <input
                      value={
                        searchTerm
                      }
                      onChange={(e) =>
                        setSearchTerm(
                          e.target.value
                        )
                      }
                      placeholder="Search by name, phone number, membership plan, or gender..."
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-3 pl-11 pr-4 text-sm outline-none focus:border-red-500"
                    />

                  </div>

                  {searchTerm && (
                    <p className="mt-3 text-xs text-zinc-500">
                      Showing{" "}
                      {
                        filteredMembers.length
                      }{" "}
                      of{" "}
                      {
                        members.length
                      }{" "}
                      members
                    </p>
                  )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">

                  <div className="overflow-x-auto">

                    <table className="w-full text-left text-sm">

                      <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-500">

                        <tr>

                          <th className="px-5 py-4">
                            Name
                          </th>

                          <th className="px-5 py-4">
                            Age
                          </th>

                          <th className="px-5 py-4">
                            Gender
                          </th>

                          <th className="px-5 py-4">
                            Phone
                          </th>

                          <th className="px-5 py-4">
                            Plan
                          </th>

                          <th className="px-5 py-4">
                            Start
                          </th>

                          <th className="px-5 py-4">
                            Expiry
                          </th>

                          <th className="px-5 py-4">
                            Payment
                          </th>

                          <th className="px-5 py-4">
                            Action
                          </th>

                        </tr>
                      </thead>

                      <tbody>

                        {filteredMembers.length >
                        0 ? (
                          filteredMembers.map(
                            (member) => (
                              <tr
                                key={
                                  member.id
                                }
                                className="border-b border-zinc-800/70 last:border-0"
                              >

                                <td className="px-5 py-4 font-medium">
                                  {
                                    member.name
                                  }
                                </td>

                                <td className="px-5 py-4 text-zinc-400">
                                  {
                                    member.age
                                  }
                                </td>

                                <td className="px-5 py-4 text-zinc-400">
                                  {
                                    member.gender
                                  }
                                </td>

                                <td className="px-5 py-4 text-zinc-400">
                                  {
                                    member.phone
                                  }
                                </td>

                                <td className="px-5 py-4 text-zinc-400">
                                  {
                                    member.plan
                                  }
                                </td>

                                <td className="px-5 py-4 text-zinc-400">
                                  {formatDate(
                                    member.startDate
                                  )}
                                </td>

                                <td className="px-5 py-4 text-zinc-400">
                                  {
                                    member.expiry
                                  }
                                </td>

                                <td className="px-5 py-4">

                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                      member.status ===
                                      "Paid"
                                        ? "bg-green-500/10 text-green-400"
                                        : "bg-yellow-500/10 text-yellow-400"
                                    }`}
                                  >
                                    {
                                      member.status
                                    }
                                  </span>

                                </td>

                                <td className="px-5 py-4">

                                  <div className="flex gap-2">

                                    <button
                                      onClick={() =>
                                        openEditMember(
                                          member
                                        )
                                      }
                                      className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-white hover:border-red-500 hover:bg-red-500/10"
                                    >
                                      ✏️ Edit
                                    </button>

                                    <button
                                      onClick={() =>
                                        openDeleteMember(
                                          member
                                        )
                                      }
                                      className="rounded-lg border border-red-900/60 px-3 py-2 text-xs font-semibold text-red-400 hover:border-red-500 hover:bg-red-500/10"
                                    >
                                      🗑️ Delete
                                    </button>

                                  </div>
                                </td>

                              </tr>
                            )
                          )
                        ) : (
                          <tr>

                            <td
                              colSpan={9}
                              className="px-5 py-12 text-center"
                            >

                              <p className="text-lg font-semibold">
                                {loading
                                  ? "Loading members..."
                                  : "No members found"}
                              </p>

                              {!loading && (
                                <p className="mt-2 text-sm text-zinc-500">
                                  Try searching
                                  with a
                                  different
                                  name,
                                  phone
                                  number,
                                  plan, or
                                  gender.
                                </p>
                              )}

                            </td>
                          </tr>
                        )}

                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* PLANS */}
            {activePage ===
              "Plans" && (
              <div>

                <h2 className="mb-2 text-2xl font-bold">
                  Membership Plans
                </h2>

                <p className="mb-6 text-zinc-500">
                  Manage your gym's
                  pricing.
                </p>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                  {plans.map(
                    (plan) => (
                      <div
                        key={
                          plan.name
                        }
                        className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6"
                      >

                        <h3 className="font-bold">
                          {
                            plan.name
                          }
                        </h3>

                        <p className="mt-4 text-3xl font-black">
                          ₹
                          {plan.price.toLocaleString(
                            "en-IN"
                          )}
                        </p>

                      </div>
                    )
                  )}

                </div>
              </div>
            )}

            {/* AI ASSISTANT */}
            {activePage ===
              "AI Assistant" && (
              <div className="mx-auto max-w-4xl">

                <div className="mb-8 text-center">

                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600 text-2xl shadow-lg shadow-red-900/30">
                    ✦
                  </div>

                  <h2 className="text-3xl font-black">
                    Gym AI Assistant
                  </h2>

                  <p className="mt-2 text-zinc-500">
                    Ask GYMAI anything about
                    your gym.
                  </p>

                </div>

                <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                  {[
                    "How many active members do I have?",
                    "Who has pending payments?",
                    "Which members expire in the next 7 days?",
                    "How much revenue have we collected?",
                  ].map(
                    (question) => (
                      <button
                        key={question}
                        onClick={() =>
                          askAI(question)
                        }
                        disabled={
                          aiLoading
                        }
                        className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-left text-xs text-zinc-400 transition hover:border-red-600/60 hover:bg-red-950/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {question}
                      </button>
                    )
                  )}

                </div>

                <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">

                  <div className="flex items-center gap-3 border-b border-zinc-800 p-5">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600">
                      ✦
                    </div>

                    <div>
                      <p className="font-bold">
                        GYMAI
                      </p>

                      <p className="text-xs text-green-400">
                        ● Connected to gym data
                      </p>
                    </div>

                  </div>

                  <div className="max-h-[500px] min-h-[350px] space-y-4 overflow-y-auto p-5">

                    {aiMessages.map(
                      (message, index) => (
                        <div
                          key={index}
                          className={`flex ${
                            message.role ===
                            "user"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >

                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                              message.role ===
                              "user"
                                ? "rounded-br-md bg-red-600 text-white"
                                : "rounded-bl-md border border-zinc-800 bg-zinc-950 text-zinc-300"
                            }`}
                          >
                            <div className="whitespace-pre-wrap">
                              {
                                message.content
                              }
                            </div>
                          </div>

                        </div>
                      )
                    )}

                    {aiLoading && (
                      <div className="flex justify-start">

                        <div className="rounded-2xl rounded-bl-md border border-zinc-800 bg-zinc-950 px-5 py-4">

                          <div className="flex items-center gap-1">

                            <span className="h-2 w-2 animate-bounce rounded-full bg-red-500 [animation-delay:-0.3s]" />

                            <span className="h-2 w-2 animate-bounce rounded-full bg-red-500 [animation-delay:-0.15s]" />

                            <span className="h-2 w-2 animate-bounce rounded-full bg-red-500" />

                            <span className="ml-2 text-xs text-zinc-500">
                              GYMAI is thinking...
                            </span>

                          </div>

                        </div>

                      </div>
                    )}

                  </div>

                  <div className="border-t border-zinc-800 p-4">

                    <div className="flex gap-3">

                      <input
                        value={
                          aiInput
                        }
                        onChange={(e) =>
                          setAiInput(
                            e.target.value
                          )
                        }
                        onKeyDown={
                          handleAiKeyDown
                        }
                        disabled={
                          aiLoading
                        }
                        placeholder="Ask about members, payments, revenue, expiry..."
                        className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-red-500 disabled:opacity-50"
                      />

                      <button
                        onClick={() =>
                          askAI()
                        }
                        disabled={
                          aiLoading ||
                          !aiInput.trim()
                        }
                        className="rounded-xl bg-red-600 px-5 font-semibold transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {aiLoading
                          ? "..."
                          : "Ask"}
                      </button>

                    </div>

                    <p className="mt-2 text-center text-[11px] text-zinc-600">
                      Press Enter to send
                    </p>

                  </div>

                </div>

              </div>
            )}

          </div>
        </section>
      </div>

      {/* =====================================================
          ADD MEMBER MODAL
      ===================================================== */}

      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">

          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">

            <div className="mb-6 flex items-center justify-between">

              <div>

                <h2 className="text-2xl font-bold">
                  Add New Member
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Register a new gym
                  member.
                </p>

              </div>

              <button
                onClick={() =>
                  setShowAddMember(false)
                }
                className="text-2xl text-zinc-500 hover:text-white"
              >
                ×
              </button>

            </div>

            <div className="space-y-4">

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Name
                </label>

                <input
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                  placeholder="Enter member name"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-red-500"
                />

              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                <div>

                  <label className="mb-2 block text-sm font-medium">
                    Age
                  </label>

                  <input
                    type="number"
                    value={age}
                    onChange={(e) =>
                      setAge(
                        e.target.value
                      )
                    }
                    placeholder="Age"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-red-500"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-sm font-medium">
                    Gender
                  </label>

                  <select
                    value={gender}
                    onChange={(e) =>
                      setGender(
                        e.target.value as Gender
                      )
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-red-500"
                  >
                    <option value="Male">
                      Male
                    </option>

                    <option value="Female">
                      Female
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>

                </div>

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Phone
                </label>

                <input
                  type="tel"
                  value={phone}
                  onChange={(e) =>
                    setPhone(
                      e.target.value
                    )
                  }
                  placeholder="Phone number"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-red-500"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Membership Plan
                </label>

                <select
                  value={
                    selectedPlan
                  }
                  onChange={(e) =>
                    setSelectedPlan(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-red-500"
                >

                  {plans.map(
                    (plan) => (
                      <option
                        key={
                          plan.name
                        }
                        value={
                          plan.name
                        }
                      >
                        {plan.name} — ₹
                        {plan.price.toLocaleString(
                          "en-IN"
                        )}
                      </option>
                    )
                  )}

                </select>

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Start Date
                </label>

                <input
                  type="date"
                  value={
                    startDate
                  }
                  onChange={(e) =>
                    setStartDate(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-red-500"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Payment Status
                </label>

                <select
                  value={
                    paymentStatus
                  }
                  onChange={(e) =>
                    setPaymentStatus(
                      e.target
                        .value as
                        | "Paid"
                        | "Pending"
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-red-500"
                >

                  <option value="Paid">
                    Paid
                  </option>

                  <option value="Pending">
                    Pending
                  </option>

                </select>

              </div>

              {startDate && (
                <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4">

                  <p className="text-xs text-zinc-500">
                    Calculated Expiry
                    Date
                  </p>

                  <p className="mt-1 font-bold text-red-400">
                    {calculateExpiry(
                      startDate,
                      plans.find(
                        (p) =>
                          p.name ===
                          selectedPlan
                      )?.months || 1
                    )}
                  </p>

                </div>
              )}

              <div className="flex gap-3 pt-2">

                <button
                  onClick={() =>
                    setShowAddMember(
                      false
                    )
                  }
                  disabled={saving}
                  className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 font-semibold hover:bg-zinc-800 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={addMember}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-semibold hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Add Member"}
                </button>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          EDIT MEMBER MODAL
      ===================================================== */}

      {showEditMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">

          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">

            <div className="mb-6 flex items-center justify-between">

              <div>

                <h2 className="text-2xl font-bold">
                  Edit Member
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Update member
                  information.
                </p>

              </div>

              <button
                onClick={
                  closeEditModal
                }
                className="text-2xl text-zinc-500 hover:text-white"
              >
                ×
              </button>

            </div>

            <div className="space-y-4">

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Name
                </label>

                <input
                  value={
                    editName
                  }
                  onChange={(e) =>
                    setEditName(
                      e.target.value
                    )
                  }
                  placeholder="Enter member name"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-red-500"
                />

              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                <div>

                  <label className="mb-2 block text-sm font-medium">
                    Age
                  </label>

                  <input
                    type="number"
                    value={
                      editAge
                    }
                    onChange={(e) =>
                      setEditAge(
                        e.target.value
                      )
                    }
                    placeholder="Age"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-700 px-4 py-3 outline-none focus:border-red-500"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-sm font-medium">
                    Gender
                  </label>

                  <select
                    value={editGender}
                    onChange={(e) =>
                      setEditGender(
                        e.target.value as Gender
                      )
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-red-500"
                  >
                    <option value="Male">
                      Male
                    </option>

                    <option value="Female">
                      Female
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>

                </div>

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Phone
                </label>

                <input
                  type="tel"
                  value={
                    editPhone
                  }
                  onChange={(e) =>
                    setEditPhone(
                      e.target.value
                    )
                  }
                  placeholder="Phone number"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-red-500"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Membership Plan
                </label>

                <select
                  value={
                    editPlan
                  }
                  onChange={(e) =>
                    setEditPlan(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-red-500"
                >

                  {plans.map(
                    (plan) => (
                      <option
                        key={
                          plan.name
                        }
                        value={
                          plan.name
                        }
                      >
                        {plan.name} — ₹
                        {plan.price.toLocaleString(
                          "en-IN"
                        )}
                      </option>
                    )
                  )}

                </select>

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Start Date
                </label>

                <input
                  type="date"
                  value={
                    editStartDate
                  }
                  onChange={(e) =>
                    setEditStartDate(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-red-500"
                />

              </div>

              {editStartDate && (
                <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4">

                  <p className="text-xs text-zinc-500">
                    New Expiry Date
                  </p>

                  <p className="mt-1 font-bold text-red-400">
                    {calculateExpiry(
                      editStartDate,
                      plans.find(
                        (p) =>
                          p.name ===
                          editPlan
                      )?.months || 1
                    )}
                  </p>

                </div>
              )}

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Payment Status
                </label>

                <select
                  value={
                    editPaymentStatus
                  }
                  onChange={(e) =>
                    setEditPaymentStatus(
                      e.target
                        .value as
                        | "Paid"
                        | "Pending"
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-red-500"
                >

                  <option value="Paid">
                    Paid
                  </option>

                  <option value="Pending">
                    Pending
                  </option>

                </select>

              </div>

              <div className="flex gap-3 pt-2">

                <button
                  onClick={
                    closeEditModal
                  }
                  disabled={saving}
                  className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 font-semibold hover:bg-zinc-800 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={
                    saveEditedMember
                  }
                  disabled={saving}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-semibold hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          DELETE CONFIRMATION
      ===================================================== */}

      {showDeleteMember &&
        memberToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">

            <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">

              <div className="mb-6 flex items-start gap-4">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-xl">
                  ⚠️
                </div>

                <div>

                  <h2 className="text-xl font-bold">
                    Delete Member?
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-zinc-400">

                    Are you sure you
                    want to delete{" "}

                    <span className="font-semibold text-white">
                      {
                        memberToDelete.name
                      }
                    </span>
                    ?

                  </p>

                  <p className="mt-2 text-xs text-red-400">
                    This action cannot
                    be undone.
                  </p>

                </div>
              </div>

              <div className="flex gap-3">

                <button
                  onClick={
                    closeDeleteModal
                  }
                  disabled={saving}
                  className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 font-semibold hover:bg-zinc-800 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={
                    confirmDeleteMember
                  }
                  disabled={saving}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-semibold hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Deleting..."
                    : "Delete Member"}
                </button>

              </div>

            </div>
          </div>
        )}
    </main>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">

      <div className="flex items-center justify-between">

        <p className="text-sm text-zinc-500">
          {title}
        </p>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 font-bold text-red-500">
          {icon}
        </div>

      </div>

      <p className="mt-4 text-3xl font-black">
        {value}
      </p>

      <p className="mt-2 text-xs text-zinc-500">
        {description}
      </p>

    </div>
  );
}

/* =========================================================
   EXPIRY MEMBER
========================================================= */

function ExpiryMember({
  name,
  days,
}: {
  name: string;
  days: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">

      <div>

        <p className="text-sm font-semibold">
          {name}
        </p>

        <p className="mt-1 text-xs text-zinc-500">
          Membership expiry
        </p>

      </div>

      <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
        {days}
      </span>

    </div>
  );
}