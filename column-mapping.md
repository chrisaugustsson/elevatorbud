# Excel → Convex Column Mapping

## Hissar sheet

| Col | Swedish (Excel) | Convex field | Table |
|-----|-----------------|--------------|-------|
| C1 | Inventerings datum | — | — |
| C2 | Kund nummer | organization_number | organizations |
| C3 | Kund | name | organizations |
| C4 | Kontaktperson | contact_person | organizations |
| C5 | Telefonnummer | phone_number | organizations |
| C6 | E-mail | email | organizations |
| C7 | Distrikt/ Ort | district | elevators |
| C8 | Fastighets beteckning | **missing** | — |
| C9 | Hissbeteckning | elevator_designation | elevators |
| C10 | Hissadress | address | elevators |
| C11 | Besiktningsorgan | inspection_authority | elevators |
| C12 | Hissnummer | elevator_number | elevators |
| C13 | Besiktningsmånad | inspection_month | elevators |
| C14 | Skötselföretag | maintenance_company | elevators |
| C15 | Märklast / Antal personer | load_capacity | elevators |
| C16 | Antal Plan/ Antal Dörrar | floor_count + door_count | elevators |
| C17 | Typ av dörrar | door_type | elevators |
| C18 | Genomgång | passthrough | elevators |
| C19 | Kollektiv | collective | elevators |
| C20 | Bärbeslag automatdörrar typ och år | grab_rail | elevators |
| C21 | Dörrmaskin / Korgdörr typ och år | door_machine | elevators |
| C22 | Korgstorlek BxDjxH i mm | cab_size | elevators |
| C23 | Dagöppning dörrar BxH | daylight_opening | elevators |
| C24 | Nödtelefon | has_emergency_phone + emergency_phone_model + emergency_phone_type | elevators |
| C25 | Hastighet i m/s | speed | elevators |
| C26 | Lyfthöjd i m | lift_height | elevators |
| C27 | Schaktbelysning | shaft_lighting | elevators |
| C28 | Hisstyp | elevator_type | elevators |
| C29 | Byggår | build_year | elevators |
| C30 | Moderniseringsår | modernization_year | elevators |
| C31 | Garanti | warranty | elevators |
| C32 | Rekommenderat moderniseringsår | recommended_modernization_year | elevators |
| C33 | Uppdaterat budgetbelopp 2026 | budget_amount | elevators |
| C34 | EJ aktuellt budgetbelopp | **missing** | — |
| C35 | Drivsystem | drive_system | elevators |
| C36 | Upphängning | suspension | elevators |
| C37 | Hiss Fabrikat | manufacturer | elevators |
| C38 | Maskinplacering | machine_placement | elevators |
| C39 | Typ av maskin och år | machine_type | elevators |
| C40 | Typ av styrsystem och år | control_system_type | elevators |
| C41 | Övriga kommentarer | comments | elevators |
| C42 | Åtgärder vid modernisering | modernization_measures | elevators |

## Nödtelefoner sheet

| Col | Swedish (Excel) | Convex field | Table |
|-----|-----------------|--------------|-------|
| C1 | Inventerings datum | — | — |
| C2 | Kund | name | organizations |
| C3 | Distrikt/ Ort | district | elevators |
| C4 | Hissbeteckning | elevator_designation | elevators |
| C5 | Hissadress | address | elevators |
| C6 | Besiktningsorgan | inspection_authority | elevators |
| C7 | Hissnummer | elevator_number | elevators |
| C8 | Nödtelefon | emergency_phone_model | elevators |
| C9 | Uppdatering | needs_upgrade | elevators |
| C10 | Ca pris | emergency_phone_price | elevators |
| C11 | Pris | emergency_phone_price | elevators |
