"""
Idempotent seed data for each store.

All functions take a Store and create their respective records only if
they don't already exist (matched by a sensible natural key — e.g., task
text within a shift). Safe to re-run on every deploy.
"""

from .models import FOHTaskTemplate, ShiftTag


# ---------------------------------------------------------------------------
# FOH Tasks — mirrors the hardcoded lists in frontend/src/components/FOHTasks.js
# ---------------------------------------------------------------------------

FOH_OPENING_TASKS = [
    "Stock all wall combines",
    "Stock Ice cream, Milks, Whip Cream, and Shake Base",
    "Make Salad Kits",
    "Dining Room Tables Clean",
    "Glass Cleaned in Dining Room",
    "Tea, Ice, and Lemonade Stocked",
    "All counters wiped down EVERYWHERE",
    "Sweep and Mop Drive",
    "Trays Cleaned",
    "3 Coffee base made",
    "Napkins and Drink holders",
    "Shakes-Replace any syrups/Cookies",
    "Dumpster Pad Check",
    "8 lemonades made",
    "All Headset batteries charging",
    "Cups and lids",
]

FOH_TRANSITION_TASKS = [
    "Mid-shift inventory check",
    "Restock napkin holders",
    "Check drink station supplies",
    "Clean and organize POS stations",
    "Sweep dining room floor",
    "Check restroom supplies",
]

FOH_CLOSING_TASKS = [
    "Dining Room Trash",
    "Put up propane in marketing closet",
    "make sure heaters are off in drive thru",
    "lock doors",
    "Men's Restroom",
    "Women's Restroom",
    "Make Salad Kits",
    "Stock Dressings",
    "Stock Ice cream, Milks, Whip Cream, and Shake Base",
    "Break Down and Clean Lemonades",
    "Drain Tea Urns and Take Them to Dishes",
    "Plug in all Ipads, Card Readers, and Headset Batteries",
    "Clean Sinks",
    "Clean FC",
    "Clean Coffees",
    "Clean Trays",
    "Clean Screens",
    "Break Down and Clean Drink Stations",
    "Final walkthrough",
    "Set alarm system",
    "Check all doors locked",
    "Turn off all lights",
    "Count registers",
    "Prepare deposit",
    "Clean shake machine",
    "Mop floors",
    "Take out trash",
    "Clean shake area",
    "Restock sauce bottles",
    "Clean ice machine",
    "Sanitize tables",
    "Clean windows",
    "Stock cups for tomorrow",
    "Check cooler temperatures",
]


def seed_foh_tasks(store):
    """Create the FOH task templates if they don't already exist for this store."""
    plan = [
        ("opening", FOH_OPENING_TASKS),
        ("transition", FOH_TRANSITION_TASKS),
        ("closing", FOH_CLOSING_TASKS),
    ]
    created = 0
    for shift, items in plan:
        for order, text in enumerate(items):
            _, was_created = FOHTaskTemplate.objects.get_or_create(
                store=store, shift=shift, text=text,
                defaults={"order": order},
            )
            if was_created:
                created += 1
    print(f"    FOH task templates: +{created} created "
          f"(across opening/transition/closing).")


# ---------------------------------------------------------------------------
# Shift Summary tags — mirrors WIN_OPTIONS/CHALLENGE_OPTIONS in ShiftSummary.js
# ---------------------------------------------------------------------------

WIN_TAGS = [
    "Strong sales",
    "Fast drive-thru",
    "Great teamwork",
    "Clean handoff",
    "Low waste",
    "Guest recovery win",
]

CHALLENGE_TAGS = [
    "Staffing",
    "Inventory",
    "Customer rush",
    "POS / tech",
    "Training gaps",
    "Equipment issue",
]


def seed_shift_tags(store):
    """Create the win + challenge tag catalog if it doesn't exist."""
    created = 0
    for kind, items in (("win", WIN_TAGS), ("challenge", CHALLENGE_TAGS)):
        for order, label in enumerate(items):
            _, was_created = ShiftTag.objects.get_or_create(
                store=store, kind=kind, label=label,
                defaults={"order": order, "is_active": True},
            )
            if was_created:
                created += 1
    print(f"    Shift tags: +{created} created (wins + challenges).")


# ---------------------------------------------------------------------------
# Top-level entry point
# ---------------------------------------------------------------------------

def seed_all_for_store(store):
    """Run every per-store seeder. Idempotent."""
    print(f"  Seeding data for {store}…")
    seed_foh_tasks(store)
    seed_shift_tags(store)
