"""
Idempotent seed data for each store.

All functions take a Store and create their respective records only if
they don't already exist (matched by a sensible natural key — e.g., task
text within a shift). Safe to re-run on every deploy.
"""

from datetime import date, timedelta

from .models import (
    CleaningTask,
    FOHTaskTemplate,
    KitchenChecklistTask,
    MealPeriod,
    MenuItem,
    SetupSheet,
    SetupSheetTemplate,
    ShiftTag,
    WasteReason,
)


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

# ---------------------------------------------------------------------------
# Setup Sheets — sample templates + a saved sheet (mirrors hardcoded UI data)
# ---------------------------------------------------------------------------

SAMPLE_TEMPLATES = [
    {"name": "NewMain"},
    {"name": "Main (Copy)"},
    {"name": "9/15 - 9/22"},
    {"name": "Summer"},
]


def seed_setup_templates(store):
    created = 0
    for t in SAMPLE_TEMPLATES:
        _, was_created = SetupSheetTemplate.objects.get_or_create(
            store=store, name=t["name"],
            defaults={"description": ""},
        )
        if was_created:
            created += 1
    print(f"    Setup sheet templates: +{created} created.")


def seed_sample_saved_setup(store):
    """Create one sample saved sheet so SavedSetups.js isn't empty on first
    visit. Idempotent — keyed off (store, name)."""
    # Week range matching the demo card: Apr 18 – Apr 25, 2026
    name = "4-19-25"
    if SetupSheet.objects.filter(store=store, name=name).exists():
        print("    Sample saved setup: already exists, skipping.")
        return
    SetupSheet.objects.create(
        store=store, name=name,
        week_start=date(2026, 4, 18),
        week_end=date(2026, 4, 25),
        is_shared=True,
        employees_count=560,
        areas_count=94,
        hours=0,
        status="published",
    )
    print("    Sample saved setup: created (4-19-25).")


# ---------------------------------------------------------------------------
# Cleaning Tasks — sample tasks across scopes + frequencies
# ---------------------------------------------------------------------------

CLEANING_TASKS = [
    # FOH — Daily
    {"scope": "foh", "frequency": "daily", "name": "Wipe down high chairs"},
    {"scope": "foh", "frequency": "daily", "name": "Sweep dining room floor"},
    {"scope": "foh", "frequency": "daily", "name": "Restock napkin holders"},
    {"scope": "foh", "frequency": "daily", "name": "Clean front door glass"},
    # FOH — Weekly
    {"scope": "foh", "frequency": "weekly", "name": "Detail-clean drink station"},
    {"scope": "foh", "frequency": "weekly", "name": "Deep clean restroom floors"},
    # FOH — Monthly
    {"scope": "foh", "frequency": "monthly", "name": "Wipe down AC vents in lobby"},
    {"scope": "foh", "frequency": "monthly", "name": "Polish countertops"},
    # FOH — Quarterly
    {"scope": "foh", "frequency": "quarterly", "name": "Steam clean carpets"},
    # Kitchen — Daily
    {"scope": "kitchen", "frequency": "daily", "name": "Wipe down prep tables"},
    {"scope": "kitchen", "frequency": "daily", "name": "Sweep & mop kitchen floor"},
    {"scope": "kitchen", "frequency": "daily", "name": "Empty trash & change liners"},
    # Kitchen — Weekly
    {"scope": "kitchen", "frequency": "weekly", "name": "Clean walk-in cooler shelves"},
    {"scope": "kitchen", "frequency": "weekly", "name": "Boil-out fryers"},
    # Kitchen — Monthly
    {"scope": "kitchen", "frequency": "monthly", "name": "Descale dish machine"},
    {"scope": "kitchen", "frequency": "monthly", "name": "Clean hood filters"},
]


def seed_cleaning_tasks(store):
    created = 0
    by_scope_freq = {}
    for t in CLEANING_TASKS:
        key = (t["scope"], t["frequency"])
        by_scope_freq[key] = by_scope_freq.get(key, 0) + 1
        order = by_scope_freq[key] - 1
        _, was_created = CleaningTask.objects.get_or_create(
            store=store, scope=t["scope"], name=t["name"], frequency=t["frequency"],
            defaults={"order": order},
        )
        if was_created:
            created += 1
    print(f"    Cleaning tasks: +{created} created.")


# ---------------------------------------------------------------------------
# Kitchen Checklists — opening / transition / closing
# Mirrors the hardcoded lists in frontend/src/components/KitchenChecklists.js
# ---------------------------------------------------------------------------

KITCHEN_OPENING_TASKS = [
    "Turn on grills and fryers",
    "Check walk-in cooler temperatures",
    "Stock breading station",
    "Prep chicken for the day",
    "Set up frying station",
    "Stock sauces and dressings",
    "Wipe down all prep surfaces",
    "Check ice machine",
    "Set up dish station",
    "Verify daily prep list",
]

KITCHEN_TRANSITION_TASKS = [
    "Dishes",
    "Needs to have enough wraps",
    "Prep chicken",
    "Restock breading area",
    "Check fryer oil",
    "Clean fryer baskets",
    "Restock wraps and parchment",
    "Wipe down low surfaces",
    "Top off sauces",
    "Check temps on hot hold",
    "Sweep kitchen floor",
    "Take out trash",
    "Restock seasoning",
    "Clean lowboy",
    "Verify daily counts",
]

KITCHEN_CLOSING_TASKS = [
    "Break down fry station",
    "Filter fryers",
    "Clean grills",
    "Wipe down all prep tables",
    "Sweep and mop kitchen floor",
    "Take out trash and break down boxes",
    "Restock for next day's open",
    "Wash all dishes",
    "Run sanitizer cycle",
    "Wipe down walk-in cooler",
    "Lock storage areas",
    "Turn off equipment",
    "Empty mop bucket",
    "Final temperature checks",
]


def seed_kitchen_checklists(store):
    plan = [
        ("opening", KITCHEN_OPENING_TASKS),
        ("transition", KITCHEN_TRANSITION_TASKS),
        ("closing", KITCHEN_CLOSING_TASKS),
    ]
    created = 0
    for shift, items in plan:
        for order, text in enumerate(items):
            _, was_created = KitchenChecklistTask.objects.get_or_create(
                store=store, shift=shift, text=text,
                defaults={"order": order},
            )
            if was_created:
                created += 1
    print(f"    Kitchen checklist tasks: +{created} created.")


# ---------------------------------------------------------------------------
# Meal Periods — global catalog (not per-store)
# ---------------------------------------------------------------------------

MEAL_PERIODS = [
    {"slug": "breakfast", "label": "Breakfast", "emoji": "🌅", "order": 0},
    {"slug": "lunch", "label": "Lunch", "emoji": "🥪", "order": 1},
    {"slug": "dinner", "label": "Dinner", "emoji": "🌙", "order": 2},
]


def seed_meal_periods():
    created = 0
    for mp in MEAL_PERIODS:
        _, was_created = MealPeriod.objects.get_or_create(
            slug=mp["slug"],
            defaults={"label": mp["label"], "emoji": mp["emoji"], "order": mp["order"]},
        )
        if was_created:
            created += 1
    print(f"  Meal periods: +{created} created.")


# ---------------------------------------------------------------------------
# Menu Items — lunch menu mirrors KitchenWasteTracker.js MENU_ITEMS_BY_PERIOD
# ---------------------------------------------------------------------------

LUNCH_MENU_ITEMS = [
    {"name": "Spicy Filet", "emoji": "🌶️", "unit_price": "1.25"},
    {"name": "Filet", "emoji": "🍗", "unit_price": "1.02"},
    {"name": "Grilled Filet", "emoji": "🥩", "unit_price": "1.12"},
    {"name": "Nuggets", "emoji": "🍗", "unit_price": "0.15"},
    {"name": "Grilled Nuggets", "emoji": "🥩", "unit_price": "0.17"},
    {"name": "Strips", "emoji": "🍗", "unit_price": "0.53"},
    {"name": "Mac & Cheese", "emoji": "🧀", "unit_price": "1.01"},
    {"name": "White Bun", "emoji": "🍞", "unit_price": "0.16"},
    {"name": "Multigrain Bun", "emoji": "🌾", "unit_price": "0.33"},
    {"name": "Gluten Free Bun", "emoji": "🌱", "unit_price": "0.85"},
    {"name": "Sandwich", "emoji": "🥪", "unit_price": "1.00"},
]


def seed_menu_items(store):
    from decimal import Decimal
    try:
        lunch = MealPeriod.objects.get(slug="lunch")
    except MealPeriod.DoesNotExist:
        print("    Menu items: skipping — lunch meal period missing.")
        return
    created = 0
    for order, item in enumerate(LUNCH_MENU_ITEMS):
        _, was_created = MenuItem.objects.get_or_create(
            store=store, meal_period=lunch, name=item["name"],
            defaults={
                "emoji": item["emoji"],
                "unit_price": Decimal(item["unit_price"]),
                "order": order,
            },
        )
        if was_created:
            created += 1
    print(f"    Menu items: +{created} created (lunch).")


# ---------------------------------------------------------------------------
# Waste Reasons — mirrors WASTE_REASONS in KitchenWasteTracker.js
# ---------------------------------------------------------------------------

WASTE_REASONS = [
    {"slug": "overproduction", "label": "Overproduction", "emoji": "📦"},
    {"slug": "quality", "label": "Quality Issues", "emoji": "⚠️"},
    {"slug": "expired", "label": "Expired", "emoji": "⏰"},
    {"slug": "dropped", "label": "Dropped", "emoji": "💧"},
]


def seed_waste_reasons(store):
    created = 0
    for order, r in enumerate(WASTE_REASONS):
        _, was_created = WasteReason.objects.get_or_create(
            store=store, slug=r["slug"],
            defaults={"label": r["label"], "emoji": r["emoji"], "order": order},
        )
        if was_created:
            created += 1
    print(f"    Waste reasons: +{created} created.")


def seed_all_for_store(store):
    """Run every per-store seeder. Idempotent."""
    print(f"  Seeding data for {store}…")
    # Global catalog (run before per-store seeds that reference it).
    seed_meal_periods()
    # Per-store seeds.
    seed_foh_tasks(store)
    seed_shift_tags(store)
    seed_setup_templates(store)
    seed_sample_saved_setup(store)
    seed_cleaning_tasks(store)
    seed_kitchen_checklists(store)
    seed_menu_items(store)
    seed_waste_reasons(store)
