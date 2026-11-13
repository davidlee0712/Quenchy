import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { PrimaryButton, inputStyle } from '@/components/ui';
import { useColors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function SignIn() {
  const c = useColors();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function submit() {
    setMessage(null);
    if (!email.trim() || password.length < 6) {
      setMessage({ text: 'Enter your email and a password of at least 6 characters.', error: true });
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signUp') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() || email.trim().split('@')[0] } },
        });
        if (error) throw error;
        if (!data.session) {
          setMessage({ text: 'Check your email and tap the confirmation link, then sign in here.', error: false });
          setMode('signIn');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : 'Could not sign in. Try again.', error: true });
    } finally {
      setBusy(false);
    }
  }

  const field = inputStyle(c);
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.brand }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 6 }}>
          <Text style={{ color: '#fff', fontSize: 40, fontWeight: '900', letterSpacing: -1 }}>Quenchy</Text>
          <Text style={{ color: '#cfe9f5', fontSize: 16 }}>Track every glass. Cheer on your friends.</Text>
        </View>
        <View style={{ backgroundColor: c.surface, borderRadius: 16, padding: 18, gap: 12 }}>
          <Text style={{ color: c.ink, fontSize: 20, fontWeight: '800' }}>{mode === 'signIn' ? 'Sign in' : 'Create your account'}</Text>
          {mode === 'signUp' ? (
            <TextInput style={field} placeholder="Your name (friends see this)" placeholderTextColor={c.muted} value={name} onChangeText={setName} autoComplete="name" />
          ) : null}
          <TextInput
            style={field}
            placeholder="Email"
            placeholderTextColor={c.muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <TextInput
            style={field}
            placeholder="Password"
            placeholderTextColor={c.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
            onSubmitEditing={submit}
          />
          {message ? <Text style={{ color: message.error ? c.danger : c.good }}>{message.text}</Text> : null}
          <PrimaryButton title={busy ? 'Please wait…' : mode === 'signIn' ? 'Sign in' : 'Create account'} onPress={submit} disabled={busy} />
          <Pressable onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')} hitSlop={8}>
            <Text style={{ color: c.water, textAlign: 'center', fontWeight: '600' }}>
              {mode === 'signIn' ? 'New here? Create an account' : 'Already have an account? Sign in'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
