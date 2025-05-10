import { NextResponse } from 'next/server';

interface CustomFieldOption {
  id: string;
  name: string;
  color: string | null;
  orderindex: number;
}

interface CustomFieldTypeConfig {
  sorting: string;
  new_drop_down: boolean;
  options: CustomFieldOption[];
}

interface CustomFieldRequest {
  id: string;
  name: string;
  type: string;
  type_config: CustomFieldTypeConfig;
  date_created: string;
  hide_from_guests: boolean;
  value: number;
  value_richtext: string | null;
  required: boolean;
}

export async function POST(request: Request) {
  try {
    const body: CustomFieldRequest = await request.json();

    // Retorna apenas o valor do custom field
    return NextResponse.json({ value: body.value });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao processar o custom field' },
      { status: 400 }
    );
  }
} 