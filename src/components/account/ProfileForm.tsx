import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isValidCpf(value: string) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    let total = 0;
    for (let index = 0; index < length; index += 1) {
      total += Number(cpf[index]) * (length + 1 - index);
    }
    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

function maskCpf(value: string) {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function maskPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

function maskPostalCode(value: string) {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, "$1-$2");
}

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome completo").max(120),
  cpf: z.string().refine((value) => !value || isValidCpf(value), "Informe um CPF válido"),
  phone: z
    .string()
    .refine(
      (value) => !value || [10, 11].includes(onlyDigits(value).length),
      "Informe um telefone válido",
    ),
  postalCode: z
    .string()
    .refine((value) => !value || onlyDigits(value).length === 8, "Informe um CEP válido"),
  street: z.string().trim().max(160),
  addressNumber: z.string().trim().max(20),
  complement: z.string().trim().max(80),
  neighborhood: z.string().trim().max(100),
  city: z.string().trim().max(100),
  state: z
    .string()
    .trim()
    .refine((value) => !value || /^[A-Za-z]{2}$/.test(value), "Use a sigla do estado"),
});

export function ProfileForm() {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [street, setStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const profile = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, cpf, phone, postal_code, street, address_number, complement, neighborhood, city, state",
        )
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!profile.data) return;
    setFullName(profile.data.full_name ?? "");
    setCpf(maskCpf(profile.data.cpf ?? ""));
    setPhone(maskPhone(profile.data.phone ?? ""));
    setPostalCode(maskPostalCode(profile.data.postal_code ?? ""));
    setStreet(profile.data.street ?? "");
    setAddressNumber(profile.data.address_number ?? "");
    setComplement(profile.data.complement ?? "");
    setNeighborhood(profile.data.neighborhood ?? "");
    setCity(profile.data.city ?? "");
    setState(profile.data.state ?? "");
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      const values = profileSchema.parse({
        fullName,
        cpf,
        phone,
        postalCode,
        street,
        addressNumber,
        complement,
        neighborhood,
        city,
        state,
      });
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: values.fullName,
          cpf: onlyDigits(values.cpf) || null,
          phone: onlyDigits(values.phone) || null,
          postal_code: onlyDigits(values.postalCode) || null,
          street: values.street || null,
          address_number: values.addressNumber || null,
          complement: values.complement || null,
          neighborhood: values.neighborhood || null,
          city: values.city || null,
          state: values.state.toUpperCase() || null,
        })
        .eq("id", profile.data!.id);
      if (error) throw error;
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: values.fullName },
      });
      if (authError) throw authError;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success("Dados pessoais atualizados");
    },
    onError: (error) => {
      toast.error(
        error instanceof z.ZodError
          ? error.issues[0]?.message
          : "Não foi possível salvar seus dados",
      );
    },
  });

  if (profile.isPending) {
    return (
      <div className="flex items-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando seus dados…
      </div>
    );
  }

  if (profile.isError) {
    return (
      <p className="text-sm text-destructive">Não foi possível carregar seus dados pessoais.</p>
    );
  }

  return (
    <form
      className="grid gap-5 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <div className="md:col-span-2">
        <Label htmlFor="profile-name">Nome completo</Label>
        <Input
          id="profile-name"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
        />
      </div>
      <div className="md:col-span-2 mt-2 border-t border-border pt-5">
        <h4 className="font-display font-semibold">Endereço</h4>
        <p className="text-xs text-muted-foreground">
          Usado para cadastro e emissão de documentos quando necessário.
        </p>
      </div>
      <div>
        <Label htmlFor="profile-postal-code">CEP</Label>
        <Input
          id="profile-postal-code"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="00000-000"
          value={postalCode}
          onChange={(event) => setPostalCode(maskPostalCode(event.target.value))}
        />
      </div>
      <div>
        <Label htmlFor="profile-street">Rua</Label>
        <Input
          id="profile-street"
          autoComplete="address-line1"
          value={street}
          onChange={(event) => setStreet(event.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="profile-number">Número</Label>
        <Input
          id="profile-number"
          value={addressNumber}
          onChange={(event) => setAddressNumber(event.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="profile-complement">Complemento</Label>
        <Input
          id="profile-complement"
          autoComplete="address-line2"
          value={complement}
          onChange={(event) => setComplement(event.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="profile-neighborhood">Bairro</Label>
        <Input
          id="profile-neighborhood"
          value={neighborhood}
          onChange={(event) => setNeighborhood(event.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="profile-city">Cidade</Label>
        <Input
          id="profile-city"
          autoComplete="address-level2"
          value={city}
          onChange={(event) => setCity(event.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="profile-state">Estado</Label>
        <Input
          id="profile-state"
          autoComplete="address-level1"
          maxLength={2}
          placeholder="SP"
          value={state}
          onChange={(event) => setState(event.target.value.toUpperCase())}
        />
      </div>
      <div>
        <Label htmlFor="profile-cpf">CPF</Label>
        <Input
          id="profile-cpf"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(event) => setCpf(maskCpf(event.target.value))}
        />
      </div>
      <div>
        <Label htmlFor="profile-phone">Telefone</Label>
        <Input
          id="profile-phone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 99999-9999"
          value={phone}
          onChange={(event) => setPhone(maskPhone(event.target.value))}
        />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="profile-email">E-mail</Label>
        <Input id="profile-email" type="email" value={profile.data.email ?? ""} disabled />
        <p className="mt-1 text-xs text-muted-foreground">
          O e-mail da conta não pode ser alterado por este formulário.
        </p>
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar dados
        </Button>
      </div>
    </form>
  );
}
