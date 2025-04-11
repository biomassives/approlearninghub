#!/usr/bin/perl
use strict;
use warnings;
use File::Find;
use File::Spec::Functions qw(catfile rel2abs);

my $root_dir = './modules'; # Adjust this path as needed

my @file_list;

find(
    sub {
        my $rel_path = rel2abs($File::Find::name);
        if (-d $_) {
            push @file_list, { type => 'directory', name => $_, path => $rel_path };
        } elsif (-f $_) {
            push @file_list, { type => 'file', name => $_, path => $rel_path };
        }
    },
    $root_dir
);

print "<ul>\n";

my %seen_dirs;

foreach my $item (@file_list) {
    if ($item->{type} eq 'directory') {
        my $rel_dir = rel2abs($item->{path});
        if (!$seen_dirs{$rel_dir}) {
            print "  <li><b>$item->{name}</b>\n";
            $seen_dirs{$rel_dir} = 1;
            print "<ul>\n";
        }
    } else {
        my $rel_file_path = rel2abs($item->{path});
        my $relative_link = substr($rel_file_path, length(rel2abs($root_dir)) + 1);
        print "    <li><a href=\"$relative_link\">$item->{name}</a></li>\n";
    }
}

foreach my $item (@file_list) {
    if ($item->{type} eq 'directory') {
        my $rel_dir = rel2abs($item->{path});
        if ($seen_dirs{$rel_dir}) {
            print "</ul>\n";
            print "  </li>\n";
            $seen_dirs{$rel_dir} = 0;
        }
    }
}
print "</ul>\n";
