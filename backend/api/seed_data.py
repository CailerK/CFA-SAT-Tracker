"""
Idempotent seed data for each store.

All functions take a Store and create their respective records only if
they don't already exist (matched by a sensible natural key — e.g., task
text within a shift). Safe to re-run on every deploy.
"""

from datetime import date, timedelta

from .models import (
    CalendarEvent,
    ChatChannel,
    CleaningTask,
    Department,
    Equipment,
    EquipmentCategory,
    Evaluation360Template,
    FOHTaskTemplate,
    FoodSafetyTask,
    GuestComplaint,
    KitchenChecklistTask,
    LeadershipModule,
    LeadershipActivity,
    MaintenanceSchedule,
    MealPeriod,
    MenuItem,
    PositionTrack,
    QuickLink,
    QuickLinkCategory,
    SetupSheet,
    SetupSheetTemplate,
    ShiftTag,
    Survey,
    SurveyQuestion,
    TemperatureTarget,
    TrainingPlan,
    User,
    Vendor,
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


# ---------------------------------------------------------------------------
# Equipment — categories + sample items + a maintenance schedule
# ---------------------------------------------------------------------------

EQUIPMENT_CATEGORIES = [
    {"slug": "hvac", "label": "HVAC", "emoji": "❄️", "order": 0},
    {"slug": "cleaning", "label": "Cleaning", "emoji": "🧽", "order": 1},
    {"slug": "pos_tech", "label": "POS / Tech", "emoji": "💻", "order": 2},
    {"slug": "safety", "label": "Safety", "emoji": "🛡️", "order": 3},
    {"slug": "cooking", "label": "Cooking", "emoji": "🔥", "order": 4},
    {"slug": "refrigeration", "label": "Refrigeration", "emoji": "🧊", "order": 5},
    {"slug": "preparation", "label": "Preparation", "emoji": "🔪", "order": 6},
    {"slug": "beverage", "label": "Beverage", "emoji": "🥤", "order": 7},
]

EQUIPMENT_BY_CATEGORY = {
    "cooking": [
        {"name": "Primary Fryers", "icon": "flame"},
        {"name": "Secondary Fryers", "icon": "flame"},
        {"name": "Grills", "icon": "beef"},
        {"name": "Pressure Fryers", "icon": "flame"},
    ],
    "refrigeration": [
        {"name": "Walk In Cooler", "icon": "snowflake"},
        {"name": "Walk In Freezer", "icon": "snowflake"},
        {"name": "Prep Area Cooler", "icon": "snowflake"},
        {"name": "Ice Machine", "icon": "snowflake"},
    ],
    "cleaning": [
        {"name": "3-Compartment Sink", "icon": "droplet"},
        {"name": "Dish Machine", "icon": "droplet"},
        {"name": "Mop Sink", "icon": "droplet"},
        {"name": "Hand Sinks", "icon": "droplet"},
    ],
    "hvac": [
        {"name": "Main HVAC", "icon": "wind"},
        {"name": "Hood Vents", "icon": "wind"},
        {"name": "Make-Up Air Unit", "icon": "wind"},
        {"name": "Filters", "icon": "wind"},
    ],
    "safety": [
        {"name": "Fire Suppression", "icon": "shield"},
        {"name": "Fire Extinguishers", "icon": "shield"},
        {"name": "First Aid Kit", "icon": "shield"},
        {"name": "Emergency Lights", "icon": "shield"},
    ],
    "pos_tech": [
        {"name": "POS Terminals", "icon": "monitor"},
        {"name": "Drive Thru Headsets", "icon": "headphones"},
        {"name": "Receipt Printers", "icon": "monitor"},
        {"name": "Kitchen Display", "icon": "monitor"},
    ],
}


def seed_equipment(store):
    from datetime import date, timedelta
    cat_created = 0
    eq_created = 0
    sched_created = 0
    for c in EQUIPMENT_CATEGORIES:
        cat_obj, was_created = EquipmentCategory.objects.get_or_create(
            store=store, slug=c["slug"],
            defaults={"label": c["label"], "emoji": c["emoji"], "order": c["order"]},
        )
        if was_created:
            cat_created += 1
        # Seed equipment in this category, if defined.
        for item in EQUIPMENT_BY_CATEGORY.get(c["slug"], []):
            _, was_created = Equipment.objects.get_or_create(
                store=store, category=cat_obj, name=item["name"],
                defaults={"icon": item["icon"], "status": "ok"},
            )
            if was_created:
                eq_created += 1

    # Add one sample schedule on Primary Fryers (mirrors KitchenEquipment.js demo data).
    try:
        primary = Equipment.objects.get(
            store=store, name="Primary Fryers",
            category__slug="cooking",
        )
        _, was_created = MaintenanceSchedule.objects.get_or_create(
            equipment=primary, task_name="Boil out",
            defaults={
                "cadence": "weekly",
                "next_due": date.today() + timedelta(days=3),
                "urgency_threshold_days": 3,
            },
        )
        if was_created:
            sched_created += 1
    except Equipment.DoesNotExist:
        pass

    print(f"    Equipment: +{cat_created} categories, +{eq_created} items, "
          f"+{sched_created} schedules.")


# ---------------------------------------------------------------------------
# Food Safety — daypart tasks + temperature targets
# ---------------------------------------------------------------------------

FOOD_SAFETY_TASKS = {
    "morning": [
        "Temp all chicken",
        "Temp all equipment",
        "Temp prep table",
        "Make sure all prep has stickers",
        "No chemicals on tables",
        "No drinks on tables (only in the right spot)",
        "Stickers on front products",
        "Use first raw in the right spot",
    ],
    "lunch": [
        "Check all temp logs",
        "Verify cooler temperatures",
        "Hot hold temp check",
        "Hand wash audit",
        "Sanitizer concentration check",
    ],
    "dinner": [
        "Final temp logs",
        "Walk-in cooler check",
        "Cooling rack verification",
        "Sanitizer recharge",
        "Surface cleaning audit",
    ],
}


def seed_food_safety_tasks(store):
    created = 0
    for daypart, items in FOOD_SAFETY_TASKS.items():
        for order, text in enumerate(items):
            _, was_created = FoodSafetyTask.objects.get_or_create(
                store=store, daypart=daypart, text=text,
                defaults={"order": order},
            )
            if was_created:
                created += 1
    print(f"    Food safety tasks: +{created} created.")


TEMPERATURE_TARGETS = [
    # Equipment
    {"kind": "equipment", "name": "Walk In Cooler", "expected_min": "22", "expected_max": "41"},
    {"kind": "equipment", "name": "Walk In Freezer", "expected_min": "-20", "expected_max": "0"},
    {"kind": "equipment", "name": "Prep Area Cooler", "expected_min": "22", "expected_max": "41"},
    {"kind": "equipment", "name": "Cooking Line", "expected_min": "35", "expected_max": "41"},
    {"kind": "equipment", "name": "Ice Cream", "expected_min": "35", "expected_max": "41"},
    # Products
    {"kind": "product", "name": "Chicken Strips", "expected_min": "35", "expected_max": "41"},
    {"kind": "product", "name": "Filets", "expected_min": "35", "expected_max": "41"},
    {"kind": "product", "name": "Nuggets", "expected_min": "35", "expected_max": "41"},
]


def seed_temperature_targets(store):
    from decimal import Decimal
    created = 0
    for order, t in enumerate(TEMPERATURE_TARGETS):
        _, was_created = TemperatureTarget.objects.get_or_create(
            store=store, kind=t["kind"], name=t["name"],
            defaults={
                "expected_min": Decimal(t["expected_min"]),
                "expected_max": Decimal(t["expected_max"]),
                "order": order,
            },
        )
        if was_created:
            created += 1
    print(f"    Temperature targets: +{created} created.")


# ---------------------------------------------------------------------------
# Phase 6: Departments + sample team members + training plans + quick links
# ---------------------------------------------------------------------------

DEPARTMENTS = [
    {"name": "foh", "display_name": "Front of House", "icon": "🛎️"},
    {"name": "kitchen", "display_name": "Kitchen", "icon": "🔥"},
    {"name": "drive_thru", "display_name": "Drive Thru", "icon": "🚗"},
    {"name": "management", "display_name": "Management", "icon": "📋"},
    {"name": "training", "display_name": "Training", "icon": "🎓"},
]


def seed_departments(store):
    created = 0
    for d in DEPARTMENTS:
        _, was_created = Department.objects.get_or_create(
            store=store, name=d["name"],
            defaults={
                "display_name": d["display_name"],
                "icon": d["icon"],
            },
        )
        if was_created:
            created += 1
    print(f"    Departments: +{created} created.")


# Mirrors the names from the LD Growth /users page (FAKE_DATA.md). These are
# created as **inactive demo users without passwords** — they show up on the
# roster but can't log in. Admins can activate or replace them later.
SAMPLE_TEAM_MEMBERS = [
    {"first": "Greg", "last": "Argyrou", "role": "manager", "is_admin": True, "depts": ["management"]},
    {"first": "Adaya", "last": "Garcia", "role": "team_member", "depts": ["foh"]},
    {"first": "Addisyn", "last": "Thomas", "role": "shift_leader", "depts": ["foh", "drive_thru"]},
    {"first": "Aleia", "last": "Anderson", "role": "team_member", "depts": ["foh"]},
    {"first": "Alisha", "last": "Champet", "role": "team_member", "depts": ["kitchen"]},
    {"first": "Aliyah", "last": "Henry", "role": "team_member", "depts": ["drive_thru"]},
    {"first": "Allison", "last": "Burlison", "role": "team_member", "depts": ["foh"]},
    {"first": "Allison", "last": "Villalobos", "role": "team_member", "depts": ["kitchen"]},
    {"first": "Ana", "last": "Aguilar Rios", "role": "team_member", "depts": ["foh"]},
    {"first": "Ana", "last": "Carranza", "role": "team_member", "depts": ["drive_thru"]},
]


def seed_sample_team_members(store):
    """Create read-only roster fillers. They can't log in (no password set)."""
    created = 0
    depts_by_slug = {d.name: d for d in Department.objects.filter(store=store)}
    for m in SAMPLE_TEAM_MEMBERS:
        email = (
            f"{m['first'].lower()}.{m['last'].lower().replace(' ', '')}"
            f"@demo.cfasattracker.com"
        )
        if User.objects.filter(email=email).exists():
            continue
        u = User.objects.create(
            username=f"{m['first'].lower()}.{m['last'].lower().replace(' ', '')}"[:30],
            email=email,
            first_name=m["first"],
            last_name=m["last"],
            role=m["role"],
            store=store,
            is_admin=m.get("is_admin", False),
            is_active=True,
            is_demo_user=True,
            company_id=store.store_number,
        )
        u.set_unusable_password()
        u.save()
        # Attach departments.
        for slug in m.get("depts", []):
            d = depts_by_slug.get(slug)
            if d:
                u.departments.add(d)
        created += 1
    print(f"    Sample team members: +{created} created.")


TRAINING_PLANS = [
    {"name": "Foundations FOH", "department": "foh", "total_steps": 10},
    {"name": "Foundations Kitchen", "department": "kitchen", "total_steps": 12},
    {"name": "Drive Thru Excellence", "department": "drive_thru", "total_steps": 8},
    {"name": "Leadership 101", "department": "management", "total_steps": 15},
]


def seed_training_plans(store):
    created = 0
    depts_by_slug = {d.name: d for d in Department.objects.filter(store=store)}
    for p in TRAINING_PLANS:
        dept = depts_by_slug.get(p["department"])
        _, was_created = TrainingPlan.objects.get_or_create(
            store=store, name=p["name"],
            defaults={
                "total_steps": p["total_steps"],
                "department": dept,
            },
        )
        if was_created:
            created += 1
    print(f"    Training plans: +{created} created.")


QUICK_LINK_CATEGORIES = [
    {"name": "Daily Tools", "color": "#E51636", "order": 0},
    {"name": "Reference", "color": "#3b82f6", "order": 1},
    {"name": "External", "color": "#10b981", "order": 2},
]

QUICK_LINKS = [
    {"label": "HotSchedules", "url": "https://app.hotschedules.com/", "category": "Daily Tools", "icon": "📅"},
    {"label": "Pathway", "url": "https://www.chick-fil-a.com/pathway", "category": "Reference", "icon": "📚"},
    {"label": "Beam", "url": "https://beam.chick-fil-a.com/", "category": "Reference", "icon": "💡"},
    {"label": "CFA Connect", "url": "https://connect.chick-fil-a.com/", "category": "External", "icon": "🔗"},
]


def seed_quick_links(store):
    cat_created = 0
    cat_by_name = {}
    for c in QUICK_LINK_CATEGORIES:
        obj, was_created = QuickLinkCategory.objects.get_or_create(
            store=store, name=c["name"],
            defaults={"color": c["color"], "order": c["order"]},
        )
        cat_by_name[c["name"]] = obj
        if was_created:
            cat_created += 1
    link_created = 0
    for order, link in enumerate(QUICK_LINKS):
        _, was_created = QuickLink.objects.get_or_create(
            store=store, label=link["label"],
            defaults={
                "url": link["url"],
                "icon": link["icon"],
                "order": order,
                "category": cat_by_name.get(link["category"]),
            },
        )
        if was_created:
            link_created += 1
    print(f"    Quick links: +{cat_created} categories, +{link_created} links.")


# ---------------------------------------------------------------------------
# Phase 7: Leadership Programs (14 programs from LD Growth)
# ---------------------------------------------------------------------------

LEADERSHIP_PROGRAMS = [
    {
        "slug": "heart-of-leadership",
        "title": "The Heart of Leadership",
        "description": "Build a foundation of character-based leadership focused on serving others first. This plan develops the essential leadership traits that inspire team members to follow you because of who you are, not just your position.",
        "duration_weeks": 0,  # All levels, no specific duration
        "order": 0,
    },
    {
        "slug": "restaurant-culture-builder",
        "title": "Restaurant Culture Builder",
        "description": "Learn to intentionally shape your restaurant's culture to create an environment where team members are engaged, guests receive exceptional service, and business results follow. This comprehensive 8-week plan provides practical tools for building a thriving culture.",
        "duration_weeks": 8,
        "order": 1,
    },
    {
        "slug": "team-development-expert",
        "title": "Team Development Expert",
        "description": "Master the skills of coaching, feedback, and talent development to build a high-performing restaurant team. This comprehensive 10-week plan equips you with practical tools to help each team member reach their full potential while driving operational excellence.",
        "duration_weeks": 10,
        "order": 2,
    },
    {
        "slug": "strategic-leadership-mastery",
        "title": "Strategic Leadership Mastery",
        "description": "Develop strategic thinking, vision-setting, and decision-making capabilities specifically for restaurant leadership. This comprehensive 12-week plan builds practical skills to think beyond day-to-day operations and lead your area with strategic purpose. Includes restaurant-specific examples and scenarios.",
        "duration_weeks": 12,
        "order": 3,
    },
    {
        "slug": "communication-influence-excellence",
        "title": "Communication & Influence Excellence",
        "description": "Master the art of clear communication and positive influence to inspire teams and drive results. This comprehensive 10-week plan develops both verbal and non-verbal communication skills essential for effective leadership.",
        "duration_weeks": 10,
        "order": 4,
    },
    {
        "slug": "operational-excellence-leader",
        "title": "Operational Excellence Leader",
        "description": "Drive efficiency, quality, and continuous improvement in restaurant operations. This comprehensive 10-week plan equips you with the tools and mindset to optimize processes and deliver consistent results.",
        "duration_weeks": 10,
        "order": 5,
    },
    {
        "slug": "innovation-change-champion",
        "title": "Innovation & Change Champion",
        "description": "Lead innovation initiatives and guide teams through change with confidence. This comprehensive 9-week plan develops the skills needed to foster creativity, adapt to change, and drive continuous improvement.",
        "duration_weeks": 9,
        "order": 6,
    },
    {
        "slug": "hospitality-leader",
        "title": "Hospitality Leader",
        "description": "Excel at creating exceptional customer experiences and building a hospitality-focused culture. This comprehensive 8-week plan develops the skills needed to consistently deliver outstanding service and recover from service failures.",
        "duration_weeks": 8,
        "order": 7,
    },
    {
        "slug": "conflict-resolution-problem-solving",
        "title": "Conflict Resolution & Problem Solving",
        "description": "Master the skills to resolve conflicts constructively and solve complex problems effectively. This comprehensive 9-week plan equips you with tools to handle difficult conversations and find win-win solutions.",
        "duration_weeks": 9,
        "order": 8,
    },
    {
        "slug": "emotional-intelligence-leader",
        "title": "Emotional Intelligence Leader",
        "description": "Develop emotional intelligence to better understand yourself and others, build stronger relationships, and lead with empathy. This comprehensive 10-week plan focuses on self-awareness, social skills, and emotional regulation with 17 practical tasks.",
        "duration_weeks": 10,
        "order": 9,
    },
    {
        "slug": "situational-leadership-mastery",
        "title": "Situational Leadership Mastery",
        "description": "Master the art of adapting your leadership style to match the situation and development level of your team members. This comprehensive 12-week plan teaches you the four leadership styles and when to use each for maximum effectiveness.",
        "duration_weeks": 12,
        "order": 10,
    },
    {
        "slug": "complete-ownership-of-area",
        "title": "Complete Ownership of an Area",
        "description": "Master the mindset and skills to take complete ownership of your area without waiting for direction. This comprehensive 10-week plan develops proactive leadership, accountability, and the initiative to drive results independently.",
        "duration_weeks": 10,
        "order": 11,
    },
    {
        "slug": "resilience-mastery",
        "title": "Resilience Mastery",
        "description": "Develop mental toughness, stress management, and the ability to thrive under pressure. This comprehensive 12-week program builds the resilience needed to lead effectively during challenging times and maintain composure when the stakes are high.",
        "duration_weeks": 12,
        "order": 12,
    },
    {
        "slug": "work-ethic-excellence",
        "title": "Work Ethic Excellence",
        "description": "Build and model exceptional work ethic that inspires your entire team. This principle-based 10-week program focuses on ownership, inspiration, and sustainable excellence rather than checklists. Develop the discipline and leadership-by-example approach that creates a culture of excellence.",
        "duration_weeks": 10,
        "order": 13,
    },
]


def seed_leadership_programs(store):
    """Create the 14 leadership development programs from LD Growth."""
    created_modules = 0
    for prog in LEADERSHIP_PROGRAMS:
        module, was_created = LeadershipModule.objects.get_or_create(
            slug=prog["slug"],
            defaults={
                "title": prog["title"],
                "description": prog["description"],
                "order": prog["order"],
                "is_active": True,
            },
        )
        if was_created:
            created_modules += 1
        
        # Create a sample activity for each module (placeholder for now).
        # In a real implementation, you'd add specific activities per program.
        activity_text = f"Complete the {prog['title']} program"
        LeadershipActivity.objects.get_or_create(
            module=module,
            activity_number=1,
            defaults={
                "title": f"{prog['title']} - Activity 1",
                "content": activity_text,
                "instructions": "Follow the program guidelines and complete all tasks.",
                "estimated_duration": prog["duration_weeks"] * 7 * 60 if prog["duration_weeks"] > 0 else 60,
                "order": 0,
                "is_active": True,
            },
        )
    
    print(f"    Leadership programs: +{created_modules} modules created.")


# Position tracks for Team Development page
POSITION_TRACKS = [
    {
        "name": "Team Member", "display_name": "Team Memb",
        "step_label": "Starting Point", "icon_key": "map-pin",
        "color_key": "red", "order": 0,
        "description": "Entry-level position",
    },
    {
        "name": "Trainer", "display_name": "Trainer",
        "step_label": "Step 2", "icon_key": "graduation-cap",
        "color_key": "red", "order": 1,
        "description": "Certified to train new team members",
    },
    {
        "name": "Zone Leader", "display_name": "Zone Leader",
        "step_label": "Step 3", "icon_key": "target",
        "color_key": "red", "order": 2,
        "description": "Leads a specific area during shifts",
    },
    {
        "name": "Shift Lead", "display_name": "Shift Lead",
        "step_label": "Run Operations", "icon_key": "award",
        "color_key": "red", "order": 3,
        "description": "Manages entire shifts",
    },
]


def seed_position_tracks(store):
    """Create the 4 position tracks for career progression."""
    created = 0
    for track in POSITION_TRACKS:
        _, was_created = PositionTrack.objects.get_or_create(
            store=store, name=track["name"],
            defaults={
                "display_name":   track.get("display_name", ""),
                "step_label":     track.get("step_label", ""),
                "icon_key":       track.get("icon_key", "map-pin"),
                "color_key":      track.get("color_key", "red"),
                "description":    track["description"],
                "order":          track["order"],
            },
        )
        if was_created:
            created += 1
    print(f"    Position tracks: +{created} created.")


# Sample 360 evaluation template
def seed_360_template(store):
    """Create a sample 360 evaluation template."""
    template, was_created = Evaluation360Template.objects.get_or_create(
        store=store,
        name="Leadership 360 Assessment",
        defaults={
            "description": "Comprehensive 360-degree leadership evaluation covering communication, decision-making, team development, and operational excellence.",
            "sections_count": 5,
            "is_active": True,
        },
    )
    if was_created:
        print("    360 evaluation template: +1 created.")
    else:
        print("    360 evaluation template: already exists.")


# ---------------------------------------------------------------------------
# Phase 8: Calendar, Guest Recovery, Vendors, Team Chat, Surveys
# ---------------------------------------------------------------------------

def seed_calendar_events(store):
    """Create sample calendar events."""
    from datetime import datetime, timedelta
    from django.utils import timezone
    
    today = timezone.now()
    events = [
        {
            "title": "Weekly Manager Meeting",
            "category": "weekly_task",
            "starts_at": today.replace(hour=9, minute=0, second=0, microsecond=0),
            "all_day": False,
        },
        {
            "title": "Team Training Day",
            "category": "store_event",
            "starts_at": (today + timedelta(days=7)).replace(hour=14, minute=0),
            "all_day": False,
        },
        {
            "title": "Inventory Deadline",
            "category": "deadline",
            "starts_at": (today + timedelta(days=14)).replace(hour=17, minute=0),
            "all_day": False,
        },
    ]
    
    created = 0
    for event_data in events:
        _, was_created = CalendarEvent.objects.get_or_create(
            store=store,
            title=event_data["title"],
            defaults={
                "category": event_data["category"],
                "starts_at": event_data["starts_at"],
                "all_day": event_data["all_day"],
            },
        )
        if was_created:
            created += 1
    print(f"    Calendar events: +{created} created.")


def seed_vendors(store):
    """Create sample vendor directory."""
    vendors = [
        {
            "name": "Sysco Food Services",
            "category": "food_beverage",
            "contact_name": "John Smith",
            "phone": "555-0100",
            "tags": ["Primary", "Weekly Delivery"],
        },
        {
            "name": "US Foods",
            "category": "food_beverage",
            "contact_name": "Jane Doe",
            "phone": "555-0101",
            "tags": ["Backup"],
        },
        {
            "name": "Cintas",
            "category": "uniforms",
            "contact_name": "Mike Johnson",
            "phone": "555-0102",
            "tags": ["Weekly Delivery"],
        },
        {
            "name": "Ecolab",
            "category": "cleaning",
            "contact_name": "Sarah Williams",
            "phone": "555-0103",
            "tags": ["Auto-Ship"],
        },
        {
            "name": "Restaurant Depot",
            "category": "supplies",
            "contact_name": "",
            "phone": "555-0104",
            "tags": [],
        },
    ]
    
    created = 0
    for vendor_data in vendors:
        _, was_created = Vendor.objects.get_or_create(
            store=store,
            name=vendor_data["name"],
            defaults={
                "category": vendor_data["category"],
                "contact_name": vendor_data["contact_name"],
                "phone": vendor_data["phone"],
                "tags": vendor_data["tags"],
            },
        )
        if was_created:
            created += 1
    print(f"    Vendors: +{created} created.")


def seed_chat_channels(store):
    """Create default chat channels.

    "Whole Store" is the default home channel matching the LD Growth pattern;
    Operations / Kitchen / FOH are common sub-groups.
    """
    channels = [
        {"name": "Whole Store", "slug": "whole-store", "is_default": True,
         "description": "All team members in the store"},
        {"name": "Operations",  "slug": "operations",  "is_default": False,
         "description": "Daily operations + leadership coordination"},
        {"name": "Kitchen",     "slug": "kitchen",     "is_default": False,
         "description": "Kitchen team announcements + quick questions"},
        {"name": "FOH",         "slug": "foh",         "is_default": False,
         "description": "Front-of-house team channel"},
    ]

    created = 0
    for c in channels:
        _, was_created = ChatChannel.objects.get_or_create(
            store=store,
            slug=c["slug"],
            defaults={
                "name": c["name"],
                "is_default": c["is_default"],
                "description": c["description"],
            },
        )
        if was_created:
            created += 1
    print(f"    Chat channels: +{created} created.")


def seed_sample_survey(store):
    """Create a sample team feedback survey."""
    survey, was_created = Survey.objects.get_or_create(
        store=store,
        title="Team Engagement Survey",
        defaults={
            "status": "active",
            "is_anonymous": True,
        },
    )
    
    if was_created:
        # Add sample questions.
        questions = [
            {
                "text": "How satisfied are you with your work environment?",
                "kind": "rating",
                "options": [],
                "order": 0,
                "required": True,
            },
            {
                "text": "What do you enjoy most about working here?",
                "kind": "text",
                "options": [],
                "order": 1,
                "required": False,
            },
            {
                "text": "Do you feel supported by your manager?",
                "kind": "yes_no",
                "options": [],
                "order": 2,
                "required": True,
            },
            {
                "text": "Which area needs the most improvement?",
                "kind": "multiple_choice",
                "options": ["Communication", "Training", "Scheduling", "Equipment", "Other"],
                "order": 3,
                "required": False,
            },
        ]
        
        for q_data in questions:
            SurveyQuestion.objects.create(
                survey=survey,
                text=q_data["text"],
                kind=q_data["kind"],
                options=q_data["options"],
                order=q_data["order"],
                required=q_data["required"],
            )
        
        print("    Sample survey: +1 created with 4 questions.")
    else:
        print("    Sample survey: already exists.")


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
    # Phase 5
    seed_equipment(store)
    seed_food_safety_tasks(store)
    seed_temperature_targets(store)
    # Phase 6
    seed_departments(store)
    # seed_sample_team_members(store)  # DISABLED: Don't auto-create demo users
    seed_training_plans(store)
    seed_quick_links(store)
    # Phase 7
    seed_leadership_programs(store)
    seed_position_tracks(store)
    seed_360_template(store)
    # Phase 8
    seed_calendar_events(store)
    seed_vendors(store)
    seed_chat_channels(store)
    seed_sample_survey(store)
