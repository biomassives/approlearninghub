#!/usr/bin/perl
use strict;
use warnings;
use File::Temp qw/tempfile/;

my $filename = 'js/app.js';
open my $fh, '+<', $filename or die "Could not open $filename: $!";
my @lines = <$fh>;
seek $fh, 0, 0;

my $output = '';
my $in_simulate_login = 0;
my $in_check_auth_status = 0;

# JavaScript code to insert
my $js_code = qq{
  // Simulate password and salt (replace with user input)
  const simulatedPassword = 'password123';
  const salt = generateSalt();

  async function generateAndEncryptToken(password, salt) {
    const token = generateRandomValue();
    const encryptedToken = await encryptToken(token, password, salt);
    console.log('Original token:', token);
    console.log('Encrypted token:', encryptedToken);
    return encryptedToken;
  }

  generateAndEncryptToken(simulatedPassword, salt).then((encryptedToken) => {
    generateEncryptionKey(simulatedPassword, salt).then(key => {
      storeEncryptedToken(encryptedToken, key, salt);
      userProfileTopRight.classList.toggle('hidden');
    });
  });
}

async function generateEncryptionKey(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
        {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

async function encryptToken(token, password, salt) {
    const key = await generateEncryptionKey(password, salt);
    const encodedToken = new TextEncoder().encode(token);
    const encryptedData = await window.crypto.subtle.encrypt(
        {
        name: 'AES-GCM',
        iv: window.crypto.getRandomValues(new Uint8Array(12)),
        },
        key,
        encodedToken
    );
    const iv = new Uint8Array(encryptedData, 0, 12);
    const ciphertext = new Uint8Array(encryptedData, 12);
    const combined = new Uint8Array(iv.length + ciphertext.length);
    combined.set(iv);
    combined.set(ciphertext, iv.length);
    return Array.from(combined)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

async function storeEncryptedToken(encryptedToken, key, salt) {
    try {
        await db.authTokens.put({ id: 1, token: encryptedToken, key: key, salt: salt });
        console.log('Encrypted token, key, and salt stored successfully.');
    } catch (error) {
        console.error('Error storing encrypted token, key, and salt:', error);
    }
}

function generateSalt() {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return array;
}
};

my $js_code_check_auth = qq{
  try {
    const authData = await db.authTokens.get(1);
    if (!authData) {
      console.log('No auth data found.');
      return 'noauth';
    }

    // Simulate password (replace with user input)
    const simulatedPassword = 'password123';

    const key = await generateEncryptionKey(simulatedPassword, authData.salt);
    const decryptedToken = await decryptToken(authData.token, key);

    if (decryptedToken) {
      registerButton.addEventListener('click', () => {
        authModal.classList.remove('hidden');
      });
      console.log('Authentication data found and decrypted.');
      return 'authenticated';
    } else {
      console.log('Decryption failed or token is invalid.');
      return 'invalid';
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    return 'error';
  }
}

async function decryptToken(encryptedTokenHex, key) {
  const encryptedToken = new Uint8Array(
    encryptedTokenHex.match(/[\\da-f]{2}/gi).map((h) => parseInt(h, 16))
  );
  const iv = encryptedToken.slice(0, 12);
  const ciphertext = encryptedToken.slice(12);
  try {
    const decryptedData = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decryptedData);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};
};

for my $line (@lines) {
    if ($line =~ /function simulateLogin\(\) {/) {
        $in_simulate_login = 1;
        $output .= $line;
        $output .= $js_code;
    } elsif ($in_simulate_login && $line =~ /}/) {
        $in_simulate_login = 0;
        next;
    } elsif ($line =~ /function checkAuthStatus\(\) {/) {
        $in_check_auth_status = 1;
        $output .= $line;
        $output .= $js_code_check_auth;
    } elsif ($in_check_auth_status && $line =~ /}/) {
        $in_check_auth_status = 0;
        next;
    } else {
        $output .= $line;
    }
}

truncate $fh, 0;
print $fh $output;
close $fh;

print "File $filename modified.\n";
